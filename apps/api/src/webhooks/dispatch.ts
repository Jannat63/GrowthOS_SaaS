import { and, eq, inArray, lte, sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { decryptToken } from '../crypto.js'
import { moduleLogger } from '../logger.js'
import { buildSignedRequest } from './signing.js'
import { isDeliverableUrl } from './url-guard.js'
import type { WsEvent } from '../ws.js'

const log = moduleLogger('webhooks')

/**
 * Outbound webhook delivery (M4 · P4.4a-2).
 *
 * Two halves, deliberately split:
 *
 *  - `enqueueWebhookDeliveries` runs on the request path, from `ws.ts`'s `publish()`. It only
 *    WRITES rows. It never sends, so a slow or dead customer endpoint can never slow down the
 *    request that produced the event.
 *  - `runWebhookDeliverySweep` runs from the scheduler and does the sending.
 *
 * Persisting before sending is what makes delivery survive a crash — the process that accepted the
 * event has durably recorded the intent to deliver it. Same reasoning as the `background_jobs` fix
 * in docs/AUDIT-2026-08-13-codebase.md #4.
 */

/**
 * Backoff schedule in milliseconds: ~10s, 1m, 5m, 30m, 2h. `attempts` indexes into it, so the array
 * length IS the attempt cap — the two cannot drift apart the way a separate MAX_ATTEMPTS constant
 * would.
 */
const BACKOFF_MS = [10_000, 60_000, 300_000, 1_800_000, 7_200_000]

export const MAX_ATTEMPTS = BACKOFF_MS.length

/** Consecutive failed deliveries before an endpoint is disabled. */
export const FAILURE_LIMIT = 20

const REQUEST_TIMEOUT_MS = 10_000

/** How many due deliveries one sweep will take. Bounds a sweep's worst-case duration. */
const SWEEP_BATCH = 100

/**
 * Next attempt time with jitter.
 *
 * The jitter is not cosmetic. A customer endpoint returning 500 fails for ALL of their events at
 * once, so an unjittered schedule re-synchronises every one of those deliveries onto the same
 * instant and fires them as a burst at an endpoint that is already in trouble. +/-20% is enough to
 * smear a retry wave without meaningfully changing the schedule.
 */
export function nextAttemptDelayMs(attempts: number, random: () => number = Math.random): number {
  const base = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)]!
  const jitter = 1 + (random() * 0.4 - 0.2)
  return Math.round(base * jitter)
}

/** True if an endpoint subscribed to this event type. `*` means every type, including future ones. */
function isSubscribed(eventTypes: string[], type: string): boolean {
  return eventTypes.includes('*') || eventTypes.includes(type)
}

/**
 * Writes one `pending` delivery per enabled, subscribed endpoint. Returns how many were written.
 *
 * Never throws: it is called from `publish()`, which is called from the middle of business
 * operations like recommendation generation. A webhook bookkeeping failure must not roll back the
 * thing the user actually asked for.
 */
export async function enqueueWebhookDeliveries(event: WsEvent): Promise<number> {
  try {
    const endpoints = await db
      .select({
        id: schema.webhookEndpoints.id,
        eventTypes: schema.webhookEndpoints.eventTypes,
      })
      .from(schema.webhookEndpoints)
      .where(
        and(
          eq(schema.webhookEndpoints.workspaceId, event.workspaceId),
          eq(schema.webhookEndpoints.enabled, true),
        ),
      )

    const subscribed = endpoints.filter((e) => isSubscribed(e.eventTypes, event.type))
    if (subscribed.length === 0) return 0

    await db.insert(schema.webhookDeliveries).values(
      subscribed.map((e) => ({
        endpointId: e.id,
        workspaceId: event.workspaceId,
        eventType: event.type,
        payload: { type: event.type, workspaceId: event.workspaceId, data: event.payload ?? {} },
      })),
    )
    return subscribed.length
  } catch (err) {
    log.error({ err, event: event.type }, 'failed to enqueue webhook deliveries')
    return 0
  }
}

/** One HTTP attempt. Separated so the sweep's bookkeeping can be tested without a network. */
async function attemptDelivery(
  url: string,
  secret: string,
  payload: unknown,
  deliveryId: string,
): Promise<{ ok: boolean; statusCode: number | null; error: string | null }> {
  // The delivery row id doubles as the `webhook-id` header, which the spec designates as the
  // consumer's idempotency key. Reusing it means a retried delivery carries the SAME id, so a
  // consumer that de-duplicates on it processes the event once even if we deliver it twice.
  const signed = buildSignedRequest(secret, payload, deliveryId)

  // Re-checked here, not just at creation. A hostname that resolved publicly when the endpoint was
  // created can resolve to an internal address now (DNS rebinding), and a row could reach this
  // table without passing through the create path at all.
  if (!(await isDeliverableUrl(url))) {
    return { ok: false, statusCode: null, error: 'Refusing to deliver: URL does not resolve to a public https address' }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: signed.headers,
      body: signed.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Redirects are NOT followed. `fetch` would otherwise chase a 3xx without re-running the SSRF
      // check, so a public URL answering `302 Location: http://169.254.169.254/...` walks straight
      // past the guard above. A webhook has no business redirecting anyway: with `manual`, a 3xx
      // arrives here as a non-ok status and is recorded as a failure like any other.
      redirect: 'manual',
    })
    const redirected = response.status >= 300 && response.status < 400
    return {
      ok: response.ok, // 2xx only
      statusCode: response.status,
      error: response.ok
        ? null
        : redirected
          ? `HTTP ${response.status} (redirects are not followed)`
          : `HTTP ${response.status}`,
    }
  } catch (err) {
    return { ok: false, statusCode: null, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Sends every delivery that is due, then records the outcome.
 *
 * Deliveries are processed one at a time on purpose. The volumes here are small, and a sequential
 * sweep cannot stampede a customer's endpoint with its own backlog the way an unbounded
 * `Promise.all` over the batch would.
 *
 * A dead endpoint cannot block others: each attempt has its own 10s timeout and its own try/catch,
 * so one failing endpoint costs the sweep ten seconds, not the sweep.
 */
export async function runWebhookDeliverySweep(): Promise<{ delivered: number; failed: number }> {
  const due = await db
    .select({
      id: schema.webhookDeliveries.id,
      endpointId: schema.webhookDeliveries.endpointId,
      eventType: schema.webhookDeliveries.eventType,
      payload: schema.webhookDeliveries.payload,
      attempts: schema.webhookDeliveries.attempts,
      url: schema.webhookEndpoints.url,
      secretEncrypted: schema.webhookEndpoints.secretEncrypted,
      enabled: schema.webhookEndpoints.enabled,
    })
    .from(schema.webhookDeliveries)
    .innerJoin(
      schema.webhookEndpoints,
      eq(schema.webhookDeliveries.endpointId, schema.webhookEndpoints.id),
    )
    .where(
      and(
        inArray(schema.webhookDeliveries.status, ['pending', 'failed']),
        // Compared against the DATABASE clock, not `new Date()`.
        //
        // `nextAttemptAt` defaults to Postgres `now()`, and on this dev Neon instance Postgres runs
        // ~900ms ahead of the Node process. A freshly-enqueued delivery is therefore stamped in the
        // future as far as the sweeping process is concerned, and an app-clock comparison excludes
        // it — so every webhook missed its first sweep and went out a minute late, silently and
        // forever. Found by a test asserting that an enqueued delivery is sent by the next sweep.
        //
        // The database clock is also the only one that stays coherent across several API instances:
        // app clocks can disagree with each other, `now()` cannot disagree with itself.
        lte(schema.webhookDeliveries.nextAttemptAt, sql`now()`),
      ),
    )
    .orderBy(schema.webhookDeliveries.nextAttemptAt)
    .limit(SWEEP_BATCH)

  let delivered = 0
  let failed = 0

  for (const row of due) {
    // The endpoint was disabled after this delivery was queued. Retire the delivery rather than
    // retrying against a URL its owner has been told is switched off.
    if (!row.enabled) {
      await db
        .update(schema.webhookDeliveries)
        .set({ status: 'exhausted', lastError: 'Endpoint disabled before delivery' })
        .where(eq(schema.webhookDeliveries.id, row.id))
      continue
    }

    let secret: string
    try {
      secret = decryptToken(row.secretEncrypted)
    } catch (err) {
      // Unreadable secret means an encryption-key problem, not a customer problem. Retrying cannot
      // help and would burn the delivery's attempts, so stop and leave a legible reason.
      log.error({ err, endpointId: row.endpointId }, 'could not decrypt webhook secret')
      await db
        .update(schema.webhookDeliveries)
        .set({ status: 'exhausted', lastError: 'Signing secret could not be decrypted' })
        .where(eq(schema.webhookDeliveries.id, row.id))
      failed++
      continue
    }

    const result = await attemptDelivery(row.url, secret, row.payload, row.id)
    const attempts = row.attempts + 1

    if (result.ok) {
      delivered++
      await db
        .update(schema.webhookDeliveries)
        .set({
          status: 'delivered',
          attempts,
          lastStatusCode: result.statusCode,
          lastError: null,
          deliveredAt: new Date(),
        })
        .where(eq(schema.webhookDeliveries.id, row.id))

      // Any success clears the endpoint's failure streak — the counter tracks CONSECUTIVE failures,
      // so an endpoint with intermittent trouble is never disabled by an accumulating total.
      await db
        .update(schema.webhookEndpoints)
        .set({ consecutiveFailures: 0 })
        .where(eq(schema.webhookEndpoints.id, row.endpointId))
      continue
    }

    failed++
    const exhausted = attempts >= MAX_ATTEMPTS
    await db
      .update(schema.webhookDeliveries)
      .set({
        status: exhausted ? 'exhausted' : 'failed',
        attempts,
        lastStatusCode: result.statusCode,
        lastError: result.error,
        nextAttemptAt: new Date(Date.now() + nextAttemptDelayMs(attempts)),
      })
      .where(eq(schema.webhookDeliveries.id, row.id))

    // Only a fully exhausted delivery counts against the endpoint. Counting every failed ATTEMPT
    // would disable an endpoint after four bad events rather than twenty.
    if (!exhausted) continue

    const [endpoint] = await db
      .update(schema.webhookEndpoints)
      .set({ consecutiveFailures: sql`${schema.webhookEndpoints.consecutiveFailures} + 1` })
      .where(eq(schema.webhookEndpoints.id, row.endpointId))
      .returning({
        id: schema.webhookEndpoints.id,
        consecutiveFailures: schema.webhookEndpoints.consecutiveFailures,
      })

    if (endpoint && endpoint.consecutiveFailures >= FAILURE_LIMIT) {
      await db
        .update(schema.webhookEndpoints)
        .set({ enabled: false, disabledAt: new Date() })
        .where(eq(schema.webhookEndpoints.id, endpoint.id))
      log.warn(
        { endpointId: endpoint.id, consecutiveFailures: endpoint.consecutiveFailures },
        'webhook endpoint disabled after repeated failures',
      )
    }
  }

  if (delivered > 0 || failed > 0) {
    log.info({ delivered, failed }, 'webhook delivery sweep complete')
  }
  return { delivered, failed }
}
