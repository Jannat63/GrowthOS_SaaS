import { describe, expect, it, vi } from 'vitest'
import { createRetryingFetch, isReadOnlyRequest } from './retry.js'

// Pure policy tests: a fake transport, no network, and an injected sleep so nothing actually waits.
// The retry logic can't be observed through the Neon driver, so it's tested at this seam instead.

const noSleep = async (): Promise<void> => {}

function body(query: string): { body: string } {
  return { body: JSON.stringify({ query, params: [] }) }
}

function netError(code?: string): Error {
  const err = new TypeError('fetch failed')
  if (code) (err as Error & { cause?: unknown }).cause = { code }
  return err
}

const ok = (): Response => new Response('{}', { status: 200 })
const status = (s: number): Response => new Response('{}', { status: s })

describe('isReadOnlyRequest', () => {
  it('recognises reads', () => {
    expect(isReadOnlyRequest(JSON.stringify({ query: 'SELECT 1' }))).toBe(true)
    expect(isReadOnlyRequest(JSON.stringify({ query: '  select * from workspaces ' }))).toBe(true)
    expect(isReadOnlyRequest(JSON.stringify({ query: 'WITH x AS (SELECT 1) SELECT * FROM x' }))).toBe(true)
  })

  it('recognises writes', () => {
    for (const q of [
      'INSERT INTO workspaces (id) VALUES ($1)',
      'UPDATE workspaces SET name = $1',
      'DELETE FROM workspaces WHERE id = $1',
      'TRUNCATE workspaces',
      'CREATE TABLE t (id text)',
    ]) {
      expect(isReadOnlyRequest(JSON.stringify({ query: q }))).toBe(false)
    }
  })

  // The dangerous case: a CTE that writes but ends in a SELECT. Matching only the leading keyword
  // would call this a read and happily replay the DELETE.
  it('does not mistake a data-modifying CTE for a read', () => {
    const q = 'WITH removed AS (DELETE FROM jobs WHERE id = $1 RETURNING *) SELECT * FROM removed'
    expect(isReadOnlyRequest(JSON.stringify({ query: q }))).toBe(false)
  })

  it('does not let a write hide behind a comment or a second statement', () => {
    expect(isReadOnlyRequest(JSON.stringify({ query: '/* SELECT */ INSERT INTO t VALUES (1)' }))).toBe(false)
    expect(isReadOnlyRequest(JSON.stringify({ query: 'SELECT 1; DELETE FROM t' }))).toBe(false)
  })

  it('treats a batch as a read only when every statement is one', () => {
    const reads = { queries: [{ query: 'SELECT 1' }, { query: 'SELECT 2' }] }
    const mixed = { queries: [{ query: 'SELECT 1' }, { query: 'INSERT INTO t VALUES (1)' }] }
    expect(isReadOnlyRequest(JSON.stringify(reads))).toBe(true)
    expect(isReadOnlyRequest(JSON.stringify(mixed))).toBe(false)
  })

  it('falls back to "write" on anything it cannot parse', () => {
    expect(isReadOnlyRequest('not json')).toBe(false)
    expect(isReadOnlyRequest(undefined)).toBe(false)
    expect(isReadOnlyRequest(JSON.stringify({ queries: [] }))).toBe(false)
    expect(isReadOnlyRequest(JSON.stringify({ query: 'VACUUM' }))).toBe(false)
  })
})

describe('createRetryingFetch', () => {
  it('returns the first successful response without retrying', async () => {
    const base = vi.fn().mockResolvedValue(ok())
    const f = createRetryingFetch(base, { sleep: noSleep })
    await f('url', body('SELECT 1'))
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('retries a read through a transient failure and succeeds', async () => {
    const base = vi.fn().mockRejectedValueOnce(netError('ECONNRESET')).mockResolvedValue(ok())
    const f = createRetryingFetch(base, { sleep: noSleep })
    const res = await f('url', body('SELECT 1'))
    expect(res.status).toBe(200)
    expect(base).toHaveBeenCalledTimes(2)
  })

  // This is the actual production failure: undici throws a bare `TypeError: fetch failed` with no
  // code at all. If an unknown cause weren't retryable for reads, the fix wouldn't fix anything.
  it('retries a read when the failure carries no cause code', async () => {
    const base = vi.fn().mockRejectedValueOnce(netError()).mockResolvedValue(ok())
    const f = createRetryingFetch(base, { sleep: noSleep })
    await f('url', body('SELECT 1'))
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('gives up after maxRetries and rethrows the original error', async () => {
    const base = vi.fn().mockRejectedValue(netError('ECONNRESET'))
    const f = createRetryingFetch(base, { sleep: noSleep, maxRetries: 2 })
    await expect(f('url', body('SELECT 1'))).rejects.toThrow('fetch failed')
    expect(base).toHaveBeenCalledTimes(3) // the original plus two retries
  })

  // The correctness core: an INSERT that may already have run must not be replayed.
  it('does NOT retry a write on an ambiguous failure', async () => {
    const base = vi.fn().mockRejectedValue(netError('ECONNRESET'))
    const f = createRetryingFetch(base, { sleep: noSleep })
    await expect(f('url', body('INSERT INTO t VALUES (1)'))).rejects.toThrow('fetch failed')
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('DOES retry a write when the request provably never arrived', async () => {
    const base = vi.fn().mockRejectedValueOnce(netError('ECONNREFUSED')).mockResolvedValue(ok())
    const f = createRetryingFetch(base, { sleep: noSleep })
    await f('url', body('INSERT INTO t VALUES (1)'))
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('never retries a 400 — that is a SQL error, not a transport fault', async () => {
    const base = vi.fn().mockResolvedValue(status(400))
    const f = createRetryingFetch(base, { sleep: noSleep })
    const res = await f('url', body('SELECT bad syntax'))
    expect(res.status).toBe(400)
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('retries a read on 5xx but not a write', async () => {
    const readBase = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValue(ok())
    await createRetryingFetch(readBase, { sleep: noSleep })('url', body('SELECT 1'))
    expect(readBase).toHaveBeenCalledTimes(2)

    const writeBase = vi.fn().mockResolvedValue(status(503))
    const res = await createRetryingFetch(writeBase, { sleep: noSleep })(
      'url',
      body('INSERT INTO t VALUES (1)'),
    )
    expect(res.status).toBe(503)
    expect(writeBase).toHaveBeenCalledTimes(1)
  })

  it('retries a write on 429 — the proxy refused it rather than ran it', async () => {
    const base = vi.fn().mockResolvedValueOnce(status(429)).mockResolvedValue(ok())
    const f = createRetryingFetch(base, { sleep: noSleep })
    await f('url', body('INSERT INTO t VALUES (1)'))
    expect(base).toHaveBeenCalledTimes(2)
  })

  it('stops when the caller aborts — that is a decision, not a fault', async () => {
    const controller = new AbortController()
    const base = vi.fn().mockImplementation(() => {
      controller.abort()
      return Promise.reject(netError('ECONNRESET'))
    })
    const f = createRetryingFetch(base, { sleep: noSleep })
    await expect(
      f('url', { ...body('SELECT 1'), signal: controller.signal }),
    ).rejects.toThrow('fetch failed')
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('backs off geometrically', async () => {
    const delays: number[] = []
    const base = vi.fn().mockRejectedValue(netError('ECONNRESET'))
    const f = createRetryingFetch(base, {
      sleep: async (ms) => void delays.push(ms),
      maxRetries: 3,
      baseDelayMs: 100,
    })
    await expect(f('url', body('SELECT 1'))).rejects.toThrow()
    expect(delays).toEqual([100, 300, 900])
  })

  it('can be disabled entirely', async () => {
    const base = vi.fn().mockRejectedValue(netError('ECONNRESET'))
    const f = createRetryingFetch(base, { sleep: noSleep, maxRetries: 0 })
    await expect(f('url', body('SELECT 1'))).rejects.toThrow()
    expect(base).toHaveBeenCalledTimes(1)
  })

  it('reports every retry so a degrading database is visible', async () => {
    const onRetry = vi.fn()
    const base = vi.fn().mockRejectedValueOnce(netError('ECONNRESET')).mockResolvedValue(ok())
    await createRetryingFetch(base, { sleep: noSleep, onRetry })('url', body('SELECT 1'))
    expect(onRetry).toHaveBeenCalledWith({ attempt: 1, delayMs: 100, reason: 'ECONNRESET' })
  })
})
