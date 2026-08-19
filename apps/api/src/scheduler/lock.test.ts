import { describe, it, expect, vi, beforeEach } from 'vitest'

const set = vi.fn()
const del = vi.fn()
vi.mock('../jobs/client.js', () => ({
  getRedis: () => ({ set, del }),
}))

// lock.ts reports through the shared pino logger, not console. Stubbed at the module boundary so
// the assertion below watches what the code actually calls and the real logger stays quiet.
const logError = vi.fn()
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: logError, warn: vi.fn(), child: () => ({ info: vi.fn(), error: logError, warn: vi.fn() }) },
  moduleLogger: () => ({ info: vi.fn(), error: logError, warn: vi.fn() }),
}))

const { withRedisLock } = await import('./lock.js')

describe('withRedisLock', () => {
  beforeEach(() => {
    set.mockReset()
    del.mockReset()
    logError.mockReset()
    del.mockResolvedValue(1) // ioredis del returns a promise; lock.ts calls .catch() on it
  })

  it('runs fn and releases when the lock is acquired', async () => {
    set.mockResolvedValueOnce('OK')
    const fn = vi.fn().mockResolvedValue(undefined)

    const ran = await withRedisLock('k', 5000, fn)

    expect(ran).toBe(true)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith('k', expect.any(String), 'PX', 5000, 'NX')
    expect(del).toHaveBeenCalledWith('k')
  })

  it('does not run fn when the lock is already held', async () => {
    set.mockResolvedValueOnce(null)
    const fn = vi.fn()

    const ran = await withRedisLock('k', 5000, fn)

    expect(ran).toBe(false)
    expect(fn).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })

  it('still releases the lock if fn throws', async () => {
    set.mockResolvedValueOnce('OK')
    del.mockResolvedValue(1)
    const fn = vi.fn().mockRejectedValue(new Error('boom'))

    await expect(withRedisLock('k', 5000, fn)).rejects.toThrow('boom')
    expect(del).toHaveBeenCalledWith('k')
  })

  it('gives up rather than hanging when Redis never answers, and skips the run', async () => {
    // The shared client has maxRetriesPerRequest: null, so an unreachable Redis leaves commands
    // queued forever instead of rejecting. Callers are cron callbacks — a hang here wedges the
    // scheduled task for the life of the process.
    set.mockReturnValueOnce(new Promise(() => {})) // never settles
    const fn = vi.fn()

    const ran = await withRedisLock('k', 5000, fn)

    expect(ran).toBe(false)
    expect(fn).not.toHaveBeenCalled()
    // pino's signature is (obj, msg) — asserting that order is the point, since passing the error
    // as a trailing printf arg would silently drop it and this is the only report of the outage.
    expect(logError).toHaveBeenCalledWith(
      { err: expect.anything() },
      expect.stringContaining('could not acquire lock'),
    )
  }, 10_000)
})
