import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { buildApp } from '../app.js'

// Integration: requires Neon (dev stack up). Real signups, real session cookies, real round-trips.
describe('creative generation routes', () => {
  const app = buildApp()
  const slug = `test-creatives-${Date.now()}`

  let workspaceId: string
  let ownerCookie: string
  let ownerId: string
  let outsiderCookie: string
  let outsiderId: string

  afterAll(async () => {
    await app.close()
    if (workspaceId) {
      await db.delete(schema.usageRecords).where(eq(schema.usageRecords.workspaceId, workspaceId))
      await db.delete(schema.brandGuidelines).where(eq(schema.brandGuidelines.workspaceId, workspaceId))
      await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId))
    }
    for (const id of [ownerId, outsiderId]) {
      if (id) await db.delete(schema.user).where(eq(schema.user.id, id))
    }
  })

  beforeAll(async () => {
    const signUp = async (email: string, name: string) => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up/email',
        payload: { email, password: 'correct-horse-battery-staple', name },
        headers: { 'content-type': 'application/json' },
      })
      const setCookie = res.headers['set-cookie']
      const cookie = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : (setCookie as string)
      expect(cookie).toBeTruthy()
      const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } })
      return { cookie, userId: JSON.parse(me.body).user.id as string }
    }

    const owner = await signUp(`creatives-owner-${Date.now()}@example.com`, 'Creatives Owner')
    ownerCookie = owner.cookie
    ownerId = owner.userId

    const createWs = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: 'Creatives Test', slug },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })
    expect(createWs.statusCode).toBe(201)
    workspaceId = JSON.parse(createWs.body).workspace.id

    // POST /workspaces starts a Growth trial fire-and-forget; wait for the row before overriding.
    for (let i = 0; i < 20; i++) {
      const [sub] = await db
        .select({ plan: schema.subscriptions.plan })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.workspaceId, workspaceId))
      if (sub) break
      await new Promise((r) => setTimeout(r, 100))
    }

    const outsider = await signUp(`creatives-outsider-${Date.now()}@example.com`, 'Creatives Outsider')
    outsiderCookie = outsider.cookie
    outsiderId = outsider.userId
  })

  const generate = (payload: Record<string, unknown>, cookie = ownerCookie) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/creatives/generate`,
      payload,
      headers: { cookie, 'content-type': 'application/json' },
    })

  const setPlan = (plan: 'starter' | 'growth' | 'scale') =>
    db.update(schema.subscriptions).set({ plan }).where(eq(schema.subscriptions.workspaceId, workspaceId))

  const clearUsage = () =>
    db.delete(schema.usageRecords).where(eq(schema.usageRecords.workspaceId, workspaceId))

  const clearGuidelines = () =>
    db.delete(schema.brandGuidelines).where(eq(schema.brandGuidelines.workspaceId, workspaceId))

  describe('generation', () => {
    beforeAll(async () => {
      await setPlan('scale')
      await clearUsage()
    })

    it('generates ad copy server-side', async () => {
      const res = await generate({
        kind: 'ad-copy',
        product: 'running shoes',
        benefit: 'run farther',
        painPoint: 'sore feet',
      })
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.kind).toBe('ad-copy')
      expect(body.adCopy.length).toBeGreaterThan(0)
      expect(body.adCopy[0]).toHaveProperty('hook')
      expect(body.generated).toBe(body.adCopy.length)
      // Scale is unlimited, so remaining is null rather than a fabricated big number.
      expect(body.remaining).toBeNull()
    })

    it('generates a UGC script', async () => {
      const res = await generate({ kind: 'ugc-script', product: 'running shoes', duration: 15 })
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.script.durationSeconds).toBe(15)
      expect(body.generated).toBe(1)
    })

    it('generates RSA headlines and descriptions', async () => {
      const res = await generate({ kind: 'rsa', keyword: 'running shoes', audience: 'Runners' })
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.headlines.length).toBeGreaterThan(0)
      expect(body.descriptions.length).toBeGreaterThan(0)
      // Platform caps. Exceeding them means the ad platform rejects or silently truncates the field.
      expect(body.headlines.every((h: string) => h.length <= 30)).toBe(true)
      expect(body.descriptions.every((d: string) => d.length <= 90)).toBe(true)
    })
  })

  describe('brand guidelines are applied server-side', () => {
    beforeAll(async () => {
      await setPlan('scale')
      await clearUsage()
    })

    afterAll(clearGuidelines)

    it('drops variants containing a banned term and reports why', async () => {
      // This is the half that could not work while generation ran in the browser: a client-side
      // generator cannot be constrained by a server-held record.
      await app.inject({
        method: 'PUT',
        url: `/api/v1/workspaces/${workspaceId}/brand-guidelines`,
        payload: { bannedTerms: ['running shoes'] },
        headers: { cookie: ownerCookie, 'content-type': 'application/json' },
      })

      const res = await generate({
        kind: 'ad-copy',
        product: 'running shoes',
        benefit: 'run farther',
        painPoint: 'sore feet',
      })
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      const allText = JSON.stringify(body.adCopy)
      expect(allText).not.toMatch(/running shoes/i)
      expect(body.dropped.length).toBeGreaterThan(0)
      expect(body.dropped[0].reason).toBe('banned-term')
      expect(body.dropped[0].detail).toBe('running shoes')
    })

    it('does not charge quota for variants the filter removed', async () => {
      // Charging for variants our own filter dropped would be billing the customer for our filter.
      await setPlan('starter')
      await clearUsage()

      const res = await generate({
        kind: 'ad-copy',
        product: 'running shoes',
        benefit: 'run farther',
        painPoint: 'sore feet',
      })
      const body = JSON.parse(res.body)

      expect(body.generated).toBe(body.adCopy.length)
      // starter = 10/month; remaining reflects only what was delivered.
      expect(body.remaining).toBe(10 - body.adCopy.length)
    })
  })

  describe('plan limit', () => {
    beforeAll(async () => {
      await clearGuidelines()
      await setPlan('starter')
      await clearUsage()
    })

    it('binds at the starter ceiling and answers 402 rather than generating for free', async () => {
      // Driven to the ceiling for real, not asserted to exist. starter = 10 creatives/month, and
      // ad-copy yields 5 per call, so two calls exhaust it and the third must be refused.
      const first = await generate({
        kind: 'ad-copy',
        product: 'shoes',
        benefit: 'comfort',
        painPoint: 'blisters',
      })
      expect(first.statusCode).toBe(200)
      expect(JSON.parse(first.body).remaining).toBe(5)

      const second = await generate({
        kind: 'ad-copy',
        product: 'shoes',
        benefit: 'comfort',
        painPoint: 'blisters',
      })
      expect(second.statusCode).toBe(200)
      expect(JSON.parse(second.body).remaining).toBe(0)

      const third = await generate({
        kind: 'ad-copy',
        product: 'shoes',
        benefit: 'comfort',
        painPoint: 'blisters',
      })
      expect(third.statusCode).toBe(402)
      expect(JSON.parse(third.body).error.code).toBe('PLAN_LIMIT_REACHED')
    })

    it('lets an upgraded plan through immediately', async () => {
      // Still at the starter ceiling from the previous test; upgrading must lift it without a reset.
      await setPlan('scale')
      const res = await generate({
        kind: 'ad-copy',
        product: 'shoes',
        benefit: 'comfort',
        painPoint: 'blisters',
      })
      expect(res.statusCode).toBe(200)
    })
  })

  describe('validation', () => {
    beforeAll(async () => {
      await setPlan('scale')
      await clearUsage()
    })

    it('refuses an unknown kind', async () => {
      const res = await generate({ kind: 'billboard', product: 'shoes' })
      expect(res.statusCode).toBe(400)
    })

    it('refuses a duration the generator has no script for', async () => {
      // generateUGCScript looks up 15|30|60; anything else falls through and returns undefined.
      const res = await generate({ kind: 'ugc-script', product: 'shoes', duration: 45 })
      expect(res.statusCode).toBe(400)
    })

    it('refuses a missing required field', async () => {
      const res = await generate({ kind: 'ad-copy', product: 'shoes' })
      expect(res.statusCode).toBe(400)
    })

    it('caps an oversized batch rather than letting one call drain the quota', async () => {
      const res = await generate({
        kind: 'ad-copy',
        product: 'shoes',
        benefit: 'comfort',
        painPoint: 'blisters',
        count: 5000,
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('authorization', () => {
    it('rejects an anonymous request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${workspaceId}/creatives/generate`,
        payload: { kind: 'rsa', keyword: 'shoes' },
        headers: { 'content-type': 'application/json' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects a signed-in non-member', async () => {
      const res = await generate({ kind: 'rsa', keyword: 'shoes' }, outsiderCookie)
      expect(res.statusCode).toBe(403)
    })
  })
})
