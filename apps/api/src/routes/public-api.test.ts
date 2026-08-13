import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { buildApp } from '../app.js'
import { startTrial } from '../billing.js'
import { createApiKey } from '../api-keys.js'

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
})
