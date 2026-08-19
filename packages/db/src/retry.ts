/**
 * Retry wrapper for the Neon HTTP driver's fetch.
 *
 * `@neondatabase/serverless` issues exactly one `fetch` per query and has no retry of its own: on a
 * network failure it wraps the cause and throws immediately as
 * `NeonDbError("Error connecting to database: ...")`. Against a free-tier Neon instance under any
 * real concurrency that surfaces constantly — it is the single error behind this project's
 * long-running API test-suite flakiness, where different files failed on every run and all of them
 * passed in isolation.
 *
 * The driver exposes `neonConfig.fetchFunction`, which takes the whole `fetch` signature, so the
 * retry belongs here rather than at any call site. That also means it protects production, not just
 * the tests: a transient blip between the API and its database should not surface to a user either.
 *
 * ## Why this inspects the SQL
 *
 * A retry after a network failure is only unconditionally safe when the request never reached the
 * server. If the statement was delivered, executed, and only the *response* was lost, retrying
 * re-executes it — and Neon's HTTP endpoint runs each statement in its own implicit transaction,
 * so there is no rollback to save us. For a SELECT that is harmless. For an INSERT it is a
 * duplicate row.
 *
 * Node's `fetch failed` covers both cases, and the error code alone cannot always separate them:
 * `ECONNREFUSED` proves nothing was delivered, `ECONNRESET` does not. So instead of guessing, this
 * splits on what the statement would *do*:
 *
 *  - **Reads** retry on any transient failure. Re-running a SELECT cannot corrupt anything.
 *  - **Writes** retry only when the request provably never arrived (connection-phase failures, and
 *    429, which means the proxy rejected it rather than ran it).
 *
 * Anything unparseable is treated as a write. The conservative direction on an unknown statement is
 * to give up a retry, not to risk duplicating one.
 */

/** Failures that happen before a request can be delivered. Retrying these cannot double-execute. */
const CONNECT_PHASE_CODES = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
])

/**
 * Failures where the request may already have been executed — the socket died after the statement
 * went out. Safe to retry for reads only.
 */
const AMBIGUOUS_CODES = new Set([
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
])

/** Status codes worth another attempt. 429 is listed separately because it is safe even for writes. */
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504])

export interface RetryOptions {
  /** Attempts after the first. 0 disables retrying entirely. */
  maxRetries?: number
  /** First backoff, in ms. Trebles each attempt. */
  baseDelayMs?: number
  /** Injected for tests so they don't actually wait. */
  sleep?: (ms: number) => Promise<void>
  /** Called before each retry — used for logging, and to assert on in tests. */
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void
}

/**
 * Native `fetch`'s own type. Deriving it rather than restating it keeps the wrapper assignable both
 * ways — a hand-written signature with looser parameters is contravariantly *not* assignable from
 * the real `fetch`, which is what the driver hands us.
 */
type FetchLike = typeof fetch
type FetchInput = Parameters<FetchLike>[0]
type FetchInit = Parameters<FetchLike>[1]

/**
 * True only if every statement in the request body is a read.
 *
 * Neon sends either `{ query, params }` or, for a batch, `{ queries: [...] }`. A batch counts as a
 * read only if all of its statements are — one write in the batch makes the whole request unsafe to
 * replay. Returns false for anything it cannot parse or recognise, which is the safe default.
 */
export function isReadOnlyRequest(body: unknown): boolean {
  if (typeof body !== 'string') return false

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return false
  }

  const statements: unknown[] =
    parsed && typeof parsed === 'object' && 'queries' in parsed
      ? ((parsed as { queries?: unknown[] }).queries ?? [])
      : [parsed]

  if (statements.length === 0) return false

  return statements.every((s) => {
    const query = (s as { query?: unknown })?.query
    if (typeof query !== 'string') return false
    return isReadOnlyStatement(query)
  })
}

/**
 * Reads are recognised by an allow-list of leading keywords, never by excluding known writers.
 * An unfamiliar statement must land on "treat as a write" — the cost of being wrong that way is one
 * un-retried query, and the cost of being wrong the other way is a duplicated row.
 *
 * A leading CTE is unwrapped rather than trusted: `WITH x AS (...) SELECT` is a read, but
 * `WITH x AS (...) INSERT` and `WITH x AS (DELETE ... RETURNING *) SELECT` are not, and only the
 * outer keyword distinguishes them. Any statement containing a data-modifying keyword anywhere is
 * rejected outright, so a CTE that writes can't slip through by ending in SELECT.
 */
function isReadOnlyStatement(query: string): boolean {
  const normalized = query
    .replace(/--[^\n]*/g, ' ') // line comments
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .trim()
    .toUpperCase()

  // Multiple statements in one string: can't reason about them, don't replay them.
  if (normalized.replace(/;\s*$/, '').includes(';')) return false

  if (/\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|COPY|CALL|DO)\b/.test(normalized)) {
    return false
  }

  return /^(SELECT|WITH|SHOW|EXPLAIN|VALUES|TABLE)\b/.test(normalized)
}

function causeCode(err: unknown): string | undefined {
  const cause = (err as { cause?: unknown })?.cause
  const code = (cause as { code?: unknown })?.code ?? (err as { code?: unknown })?.code
  return typeof code === 'string' ? code : undefined
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wraps a fetch implementation with bounded, backed-off retries.
 *
 * Exported as a factory taking its own `fetch` and `sleep` so the policy can be tested against a
 * fake transport with no network and no real delays — the retry logic is the part that has to be
 * right, and it is not observable through the driver.
 */
export function createRetryingFetch(baseFetch: FetchLike, options: RetryOptions = {}): FetchLike {
  const maxRetries = options.maxRetries ?? 2
  const baseDelayMs = options.baseDelayMs ?? 100
  const sleep = options.sleep ?? defaultSleep
  const onRetry = options.onRetry

  return async function retryingFetch(input: FetchInput, init?: FetchInit): Promise<Response> {
    const readOnly = isReadOnlyRequest(init?.body)
    let attempt = 0

    for (;;) {
      let response: Response | undefined
      let thrown: unknown
      let reason: string

      try {
        response = await baseFetch(input, init)
        if (response.ok) return response
        // A 400 is a SQL error — the statement ran and the database rejected it. Never retry.
        if (response.status !== 429 && !RETRYABLE_STATUSES.has(response.status)) return response
        // 429 means the proxy refused to run it, so it is safe to replay even for a write.
        if (response.status !== 429 && !readOnly) return response
        reason = `HTTP ${response.status}`
      } catch (err) {
        thrown = err
        const code = causeCode(err)
        const safeForWrites = code !== undefined && CONNECT_PHASE_CODES.has(code)
        const retryableForReads = code === undefined || AMBIGUOUS_CODES.has(code)

        if (!safeForWrites && !(readOnly && retryableForReads)) throw err
        reason = code ?? 'network error'
      }

      if (attempt >= maxRetries) {
        if (thrown !== undefined) throw thrown
        return response!
      }

      // Aborting mid-flight is a caller decision, not a transient fault — don't fight it.
      if (init?.signal?.aborted) {
        if (thrown !== undefined) throw thrown
        return response!
      }

      const delayMs = baseDelayMs * 3 ** attempt
      attempt += 1
      onRetry?.({ attempt, delayMs, reason })
      await sleep(delayMs)
    }
  }
}
