import { getRedis } from '../jobs/client.js'

/**
 * Run `fn` only if we win a short-lived Redis lock — so with N API instances exactly one runs a
 * given tick. The lock auto-expires after `ttlMs` (crash safety) and we delete it when done.
 * Returns whether `fn` actually ran. Set `ttlMs` comfortably above a tick's worst-case duration.
 *
 * Acquisition races a short timeout instead of awaiting the SET directly. The shared Redis client
 * (jobs/client.ts) sets `maxRetriesPerRequest: null` for the job queue's own use — correct there,
 * but it means a command issued while Redis is unreachable is queued and waits indefinitely for a
 * connection that may never come, rather than rejecting. Without this race, a Redis outage would
 * hang the caller forever; since the callers here are `cron.schedule` callbacks, that would wedge
 * the scheduled task for the life of the process, silently. (ws.ts `publish()` carries the same
 * guard for the same reason — this file was missing it and the full test suite hung on it.)
 *
 * A timeout is treated as "did not acquire", so the tick is skipped rather than run unguarded. That
 * is fail-closed on purpose: an unguarded run across several instances double-sends customer email.
 *
 * Release is deliberately not awaited. If Redis went away mid-run, awaiting the DEL would reintroduce
 * exactly the hang this function exists to avoid, and the TTL is already the documented backstop.
 */

const ACQUIRE_TIMEOUT_MS = 2_000

export async function withRedisLock(
  key: string,
  ttlMs: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const redis = getRedis()

  let acquired: string | null
  try {
    acquired = await Promise.race([
      // SET key <val> PX ttl NX → 'OK' if acquired, null if another holder has it.
      redis.set(key, '1', 'PX', ttlMs, 'NX'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('redis lock acquire timed out')), ACQUIRE_TIMEOUT_MS),
      ),
    ])
  } catch (err) {
    console.error(`[scheduler] could not acquire lock ${key} — skipping this run`, err)
    return false
  }

  if (acquired !== 'OK') return false
  try {
    await fn()
  } finally {
    void Promise.resolve(redis.del(key)).catch(() => {}) // best-effort release; the TTL is the backstop
  }
  return true
}
