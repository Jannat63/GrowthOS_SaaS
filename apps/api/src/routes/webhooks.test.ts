import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { buildApp } from '../app.js'

// Integration: requires Neon (dev stack up) — same as invitations.test.ts. Real signups, real
// session cookies, real round-trips through app.inject().
describe('webhook endpoint routes', () => {
  const app = buildApp()
  const slug = `test-webhook-routes-${Date.now()}`

  let workspaceId: string
  let ownerCookie: string
  let ownerId: string
  let outsiderCookie: string
  let outsiderId: string

  afterAll(async () => {
    await app.close()
    if (workspaceId) {
      await db.delete(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.workspaceId, workspaceId))
      await db.delete(schema.webhookEndpoints).where(eq(schema.webhookEndpoints.workspaceId, workspaceId))
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

    const owner = await signUp(`webhook-owner-${Date.now()}@example.com`, 'Webhook Owner')
    ownerCookie = owner.cookie
    ownerId = owner.userId

    const createWs = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: 'Webhook Routes Test', slug },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })
    expect(createWs.statusCode).toBe(201)
    workspaceId = JSON.parse(createWs.body).workspace.id

    // Webhooks are Scale-gated. POST /workspaces starts a trial fire-and-forget, so wait for the
    // subscription row to exist before overriding its plan — same poll as invitations.test.ts.
    for (let i = 0; i < 20; i++) {
      const [sub] = await db
        .select({ plan: schema.subscriptions.plan })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.workspaceId, workspaceId))
      if (sub) break
      await new Promise((r) => setTimeout(r, 100))
    }
    await db
      .update(schema.subscriptions)
      .set({ plan: 'scale' })
      .where(eq(schema.subscriptions.workspaceId, workspaceId))

    const outsider = await signUp(`webhook-outsider-${Date.now()}@example.com`, 'Webhook Outsider')
    outsiderCookie = outsider.cookie
    outsiderId = outsider.userId
  })

  let endpointId: string
  let issuedSecret: string

  it('creates an endpoint and returns the signing secret exactly once', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/webhooks`,
      payload: { url: 'https://example.test/hooks/growthos', eventTypes: ['recommendation:new'] },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.url).toBe('https://example.test/hooks/growthos')
    expect(body.eventTypes).toEqual(['recommendation:new'])
    expect(body.secret).toMatch(/^whsec_/)

    endpointId = body.id
    issuedSecret = body.secret
  })

  it('never returns the secret again from the list route', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${workspaceId}/webhooks`,
      headers: { cookie: ownerCookie },
    })

    expect(res.statusCode).toBe(200)
    // Checked against the whole serialized body, not just the fields we remembered to look at — a
    // secret leaking through some field nobody thought to assert on is exactly the failure mode.
    expect(res.body).not.toContain(issuedSecret)
    expect(res.body).not.toContain('secret')

    const { data, total } = JSON.parse(res.body)
    expect(total).toBe(1)
    expect(data[0]).toMatchObject({ id: endpointId, enabled: true, consecutiveFailures: 0 })
  })

  describe('validation', () => {
    const create = (payload: unknown) =>
      app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${workspaceId}/webhooks`,
        payload: payload as Record<string, unknown>,
        headers: { cookie: ownerCookie, 'content-type': 'application/json' },
      })

    it('refuses a plain-http URL rather than silently upgrading it', async () => {
      const res = await create({ url: 'http://example.test/hook', eventTypes: ['*'] })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).error.code).toBe('VALIDATION_ERROR')
    })

    it('refuses a URL that is not a URL', async () => {
      const res = await create({ url: 'not-a-url', eventTypes: ['*'] })
      expect(res.statusCode).toBe(400)
    })

    it('refuses an unknown event type instead of accepting a subscription that can never fire', async () => {
      const res = await create({ url: 'https://example.test/x', eventTypes: ['recommendation:nwe'] })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).error.message).toContain('recommendation:nwe')
    })

    it('refuses an empty subscription list', async () => {
      const res = await create({ url: 'https://example.test/x', eventTypes: [] })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('authorization', () => {
    it('rejects an unauthenticated caller', async () => {
      const res = await app.inject({ method: 'GET', url: `/api/v1/workspaces/${workspaceId}/webhooks` })
      expect(res.statusCode).toBe(401)
    })

    it('rejects a signed-in non-member', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${workspaceId}/webhooks`,
        headers: { cookie: outsiderCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('will not let another workspace delete this one\'s endpoint by id', async () => {
      // The id alone addresses the row, so scoping has to live in the query. A non-member is
      // stopped by the guard first; this asserts the 404 rather than a silent success.
      const other = await app.inject({
        method: 'POST',
        url: '/api/v1/workspaces',
        payload: { name: 'Other WS', slug: `${slug}-other` },
        headers: { cookie: outsiderCookie, 'content-type': 'application/json' },
      })
      const otherWorkspaceId = JSON.parse(other.body).workspace.id

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/workspaces/${otherWorkspaceId}/webhooks/${endpointId}`,
        headers: { cookie: outsiderCookie },
      })
      expect(res.statusCode).toBe(404)

      // The endpoint is untouched.
      const [still] = await db
        .select()
        .from(schema.webhookEndpoints)
        .where(eq(schema.webhookEndpoints.id, endpointId))
      expect(still).toBeTruthy()

      await db.delete(schema.workspaces).where(eq(schema.workspaces.id, otherWorkspaceId))
    })
  })

  it('re-enables a disabled endpoint and clears its failure count', async () => {
    await db
      .update(schema.webhookEndpoints)
      .set({ enabled: false, disabledAt: new Date(), consecutiveFailures: 20 })
      .where(eq(schema.webhookEndpoints.id, endpointId))

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/webhooks/${endpointId}/enable`,
      headers: { cookie: ownerCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toMatchObject({ id: endpointId, enabled: true, consecutiveFailures: 0 })
    expect(body.disabledAt).toBeNull()
    // Re-enabling must not rotate the secret — the customer's verifier is already deployed against it.
    expect(res.body).not.toContain('secret')
  })

  it('deletes an endpoint, and a second delete is a 404 rather than a silent success', async () => {
    const first = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/webhooks/${endpointId}`,
      headers: { cookie: ownerCookie },
    })
    expect(first.statusCode).toBe(200)
    expect(JSON.parse(first.body)).toEqual({ deleted: true })

    const second = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/webhooks/${endpointId}`,
      headers: { cookie: ownerCookie },
    })
    expect(second.statusCode).toBe(404)
  })

  it('refuses to create an endpoint below the Scale plan', async () => {
    await db
      .update(schema.subscriptions)
      .set({ plan: 'growth' })
      .where(eq(schema.subscriptions.workspaceId, workspaceId))

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/webhooks`,
      payload: { url: 'https://example.test/gated', eventTypes: ['*'] },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(402)
    expect(JSON.parse(res.body).error.code).toBe('PLAN_LIMIT_REACHED')
  })
})
