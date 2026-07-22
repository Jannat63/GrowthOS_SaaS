import { getRedis } from '../jobs/client.js'

/**
 * Run `fn` only if we win a short-lived Redis lock — so with N API instances exactly one runs a
 * given tick. The lock auto-expires after `ttlMs` (crash safety) and we delete it when done.
 * Returns whether `fn` actually ran. Set `ttlMs` comfortably above a tick's worst-case duration.
 */
export async function withRedisLock(
  key: string,
  ttlMs: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const redis = getRedis()
  // SET key <val> PX ttl NX → 'OK' if acquired, null if another holder has it.
  const acquired = await redis.set(key, '1', 'PX', ttlMs, 'NX')
  if (acquired !== 'OK') return false
  try {
    await fn()
  } finally {
    await redis.del(key).catch(() => {}) // best-effort release; the TTL is the backstop
  }
  return true
}
