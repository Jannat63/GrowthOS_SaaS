import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { buildApp } from '../app.js'
import { startTrial } from '../billing.js'
import { createApiKey } from '../api-keys.js'
import { getApiRateLimit } from '../plan-limits.js'
import { closeRedis } from '../jobs/client.js'

// Integration: requires Neon (dev stack up) — same as billing.test.ts. Keywords/reports endpoints
// additionally need ClickHouse (not available in this dev sandbox — see recommendations.test.ts
// and every other ClickHouse-dependent test in this suite for the same, pre-existing limitation).
describe('public API routes', () => {
  const app = buildApp()
  const ws = 'test-publicapi-ws'

  afterAll(async () => {
    await app.close()
    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.workspaceId, ws))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.workspaceId, ws))
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws))
  })

  it('rejects a request with no Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/v1/recommendations' })
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body).error.code).toBe('UNAUTHORIZED')
  })

  it('rejects a well-formed but unrecognized key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/v1/recommendations',
      headers: { authorization: `Bearer gos_live_${'0'.repeat(48)}` },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects a non-Bearer Authorization header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/public/v1/recommendations',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('serves real data for a valid, Scale-plan key', async () => {
    await db.insert(schema.workspaces).values({ id: ws, name: 'Pub API Test', slug: ws, createdAt: new Date() }).onConflictDoNothing()
    await startTrial(ws)
    await db.update(schema.subscriptions).set({ plan: 'scale' }).where(eq(schema.subscriptions.workspaceId, ws))

    const key = await createApiKey(ws, 'test key', 'user-1')

    const res = await app.inject({
      method: 'GET',
      url: '/api/public/v1/recommendations',
      headers: { authorization: `Bearer ${key.plaintext}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.recommendations)).toBe(true)
    expect(body.recommendations.length).toBeGreaterThan(0)
  })

  it('stops serving data once the key is revoked', async () => {
    const key = await createApiKey(ws, 'revoke me', 'user-1')
    const before = await app.inject({
      method: 'GET',
      url: '/api/public/v1/recommendations',
      headers: { authorization: `Bearer ${key.plaintext}` },
    })
    expect(before.statusCode).toBe(200)

    const [row] = await db.select({ id: schema.apiKeys.id }).from(schema.apiKeys).where(eq(schema.apiKeys.keyPrefix, key.keyPrefix))
    await db.update(schema.apiKeys).set({ revokedAt: new Date() }).where(eq(schema.apiKeys.id, row!.id))

    const after = await app.inject({
      method: 'GET',
      url: '/api/public/v1/recommendations',
      headers: { authorization: `Bearer ${key.plaintext}` },
    })
    expect(after.statusCode).toBe(401)
  })

  it('exposes an OpenAPI spec that documents the public endpoints', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/public/v1/docs/json' })
    expect(res.statusCode).toBe(200)
    const spec = JSON.parse(res.body)
    const paths = Object.keys(spec.paths ?? {})
    expect(paths).toEqual(expect.arrayContaining(['/recommendations', '/keywords', '/reports/weekly']))
  })

  // ── Per-key rate limits (M4 P4.4a-1) ──────────────────────────────────────────────────────────
  //
  // Every test here mints a FRESH key. Buckets are keyed by `api_keys.id` and live in Redis for a
  // minute, so a shared key would carry consumption between tests and make the order they run in
  // part of the result. A new key is a new bucket, which is the only isolation that holds.
  describe('per-key rate limits', () => {
    afterEach(() => {
      delete process.env.PUBLIC_API_RATE_LIMIT_MAX
    })

    const call = (plaintext: string) =>
      app.inject({
        method: 'GET',
        url: '/api/public/v1/recommendations',
        headers: { authorization: `Bearer ${plaintext}` },
      })

    it('resolves the ceiling from the plan, not from the request', async () => {
      // The Scale figure, read through the same helper the limiter calls. This is the assertion
      // that keeps the override in the tests below from hiding a broken plan lookup.
      expect(await getApiRateLimit(ws)).toBe(120)
    })

    it('emits the RateLimit-* family on a successful response, not only on a 429', async () => {
      const key = await createApiKey(ws, 'headers key', 'user-1')
      const res = await call(key.plaintext)

      expect(res.statusCode).toBe(200)
      // Draft-spec names, scoped to this plugin. A client has to be able to see its budget before
      // it is cut off — that is the whole reason these are on non-429 responses.
      expect(res.headers['ratelimit-limit']).toBe('120')
      expect(Number(res.headers['ratelimit-remaining'])).toBeLessThan(120)
      expect(res.headers['ratelimit-reset']).toBeDefined()
      // The global limiter's X-RateLimit-* set must NOT appear: app.ts exempts these routes from it.
      expect(res.headers['x-ratelimit-limit']).toBeUndefined()
    })

    // A ceiling of 1 throughout, not because the number matters but because every ALLOWED call
    // costs a real Neon round trip and a recommendation generation pass (10-20s here). A throttled
    // call is cheap — the limiter is a preHandler, so it answers before the handler runs.
    it('gives each API key its own bucket', async () => {
      process.env.PUBLIC_API_RATE_LIMIT_MAX = '1'
      const keyA = await createApiKey(ws, 'bucket A', 'user-1')
      const keyB = await createApiKey(ws, 'bucket B', 'user-1')

      expect((await call(keyA.plaintext)).statusCode).toBe(200)
      expect((await call(keyA.plaintext)).statusCode).toBe(429)

      // A is spent. B is a different key in the same workspace and from the same source IP — under
      // the per-IP limiter alone these two would have been drawing on one shared budget.
      expect((await call(keyB.plaintext)).statusCode).toBe(200)
    })

    it('throttles a key at its ceiling with the documented envelope and a Retry-After', async () => {
      process.env.PUBLIC_API_RATE_LIMIT_MAX = '1'
      const key = await createApiKey(ws, 'ceiling key', 'user-1')

      expect((await call(key.plaintext)).statusCode).toBe(200)

      const throttled = await call(key.plaintext)
      // 429, not 500. The library throws whatever errorResponseBuilder returns, so returning a
      // plain object instead of an AppError silently routes every throttle through the error
      // handler's 500 catch-all — which is what this app did until P4.4a-1.
      expect(throttled.statusCode).toBe(429)
      expect(JSON.parse(throttled.body)).toEqual({
        error: { code: 'RATE_LIMITED', message: expect.stringContaining('RateLimit-Reset'), statusCode: 429 },
      })
      expect(throttled.headers['retry-after']).toBeDefined()
      expect(throttled.headers['ratelimit-limit']).toBe('1')
      expect(throttled.headers['ratelimit-remaining']).toBe('0')
    })

    it('leaves internal /api/v1 routes alone when a public key is exhausted', async () => {
      process.env.PUBLIC_API_RATE_LIMIT_MAX = '1'
      const key = await createApiKey(ws, 'scope key', 'user-1')

      expect((await call(key.plaintext)).statusCode).toBe(200)
      expect((await call(key.plaintext)).statusCode).toBe(429)

      // 401 (no session) is the expected answer here. The claim under test is narrower than "it
      // works": it is that the public limiter did not reach a route outside its own plugin scope.
      const internal = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
      expect(internal.statusCode).not.toBe(429)
    })
  })
})

// Deliberately a separate app: the limiter's Redis connection is created when the plugin registers,
// so the only way to exercise an unreachable store is to build an app whose REDIS_URL never resolves.
describe('public API rate limits with an unreachable store', () => {
  // Its own workspace, not the one above: that describe's afterAll drops its workspace and
  // subscription, and whether this block runs before or after that teardown is not something a
  // test should depend on. Sharing it failed here exactly that way — createApiKey saw no
  // subscription, fell back to the starter plan, and 402'd on apiAccess.
  const ws = 'test-publicapi-redisdown-ws'
  const originalRedisUrl = process.env.REDIS_URL

  afterAll(async () => {
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL
    else process.env.REDIS_URL = originalRedisUrl

    // Drop the job-bridge singleton as well, and this is the load-bearing line in this hook.
    // `getRedis()` caches one client for the whole process and resolves REDIS_URL only on first
    // use — so if anything in this test reached `publish()` (recommendation generation does), that
    // singleton is now pinned to the dead port for every file this worker runs afterwards. It is
    // built with `maxRetriesPerRequest: null`, so its commands do not fail, they queue forever:
    // the next file to publish an event hangs until vitest times it out, in a file that has
    // nothing to do with rate limiting. Closing it here forces a rebuild against the real URL.
    await closeRedis().catch(() => {
      // Never connected, so `quit()` has nothing to close — the singleton is already cleared.
    })

    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.workspaceId, ws))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.workspaceId, ws))
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws))
  })

  it('fails open rather than 500ing when the rate-limit store is down', async () => {
    await db
      .insert(schema.workspaces)
      .values({ id: ws, name: 'Pub API Redis-down Test', slug: ws, createdAt: new Date() })
      .onConflictDoNothing()
    await startTrial(ws)
    await db.update(schema.subscriptions).set({ plan: 'scale' }).where(eq(schema.subscriptions.workspaceId, ws))

    // Port 1 is privileged and nothing listens on it — the connection is refused immediately
    // rather than hanging, which is exactly the case the fail-fast ioredis options exist for.
    process.env.REDIS_URL = 'redis://127.0.0.1:1'
    const app = buildApp()
    try {
      const key = await createApiKey(ws, 'redis down key', 'user-1')
      const res = await app.inject({
        method: 'GET',
        url: '/api/public/v1/recommendations',
        headers: { authorization: `Bearer ${key.plaintext}` },
      })

      // Rate limiting is a fairness control, not an authorization one, and the key was already
      // authenticated — so a store outage must not turn every public-API call into a 500.
      expect(res.statusCode).toBe(200)
    } finally {
      await app.close()
    }
  })
})
