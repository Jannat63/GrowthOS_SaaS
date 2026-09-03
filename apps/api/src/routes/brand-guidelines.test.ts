import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { buildApp } from '../app.js'

// Integration: requires Neon (dev stack up) — same shape as webhooks.test.ts. Real signups, real
// session cookies, real round-trips through app.inject().
describe('brand guidelines routes', () => {
  const app = buildApp()
  const slug = `test-brand-guidelines-${Date.now()}`

  let workspaceId: string
  let ownerCookie: string
  let ownerId: string
  let outsiderCookie: string
  let outsiderId: string

  afterAll(async () => {
    await app.close()
    if (workspaceId) {
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

    const owner = await signUp(`brand-owner-${Date.now()}@example.com`, 'Brand Owner')
    ownerCookie = owner.cookie
    ownerId = owner.userId

    const createWs = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: 'Brand Guidelines Test', slug },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })
    expect(createWs.statusCode).toBe(201)
    workspaceId = JSON.parse(createWs.body).workspace.id

    const outsider = await signUp(`brand-outsider-${Date.now()}@example.com`, 'Brand Outsider')
    outsiderCookie = outsider.cookie
    outsiderId = outsider.userId
  })

  const get = (cookie: string) =>
    app.inject({ method: 'GET', url: `/api/v1/workspaces/${workspaceId}/brand-guidelines`, headers: { cookie } })

  // `Record<string, unknown>`, not `unknown`: `unknown` fails to match inject's `InjectPayload`
  // overload, which silently resolves the call to the Chain (non-promise) signature.
  const put = (payload: Record<string, unknown>, cookie = ownerCookie) =>
    app.inject({
      method: 'PUT',
      url: `/api/v1/workspaces/${workspaceId}/brand-guidelines`,
      payload,
      headers: { cookie, 'content-type': 'application/json' },
    })

  it('returns unconfigured defaults rather than a 404 before anything is saved', async () => {
    // The settings form needs a shape to render, and "no guidelines" is the normal state for most
    // workspaces — a 404 would make the common case look like an error.
    const res = await get(ownerCookie)
    expect(res.statusCode).toBe(200)

    const { guidelines } = JSON.parse(res.body)
    expect(guidelines.configured).toBe(false)
    expect(guidelines.tone).toBe('professional')
    expect(guidelines.bannedTerms).toEqual([])
    expect(guidelines.readingLevel).toBeNull()
  })

  it('saves guidelines and reads them back', async () => {
    const res = await put({
      tone: 'bold',
      bannedTerms: ['guaranteed', '#1'],
      requiredDisclaimers: ['Terms apply.'],
      valueProps: ['fast shipping'],
      targetPersona: 'Ops leads at mid-market SaaS',
      readingLevel: 8,
    })
    expect(res.statusCode).toBe(200)

    const { guidelines } = JSON.parse((await get(ownerCookie)).body)
    expect(guidelines.configured).toBe(true)
    expect(guidelines.tone).toBe('bold')
    expect(guidelines.bannedTerms).toEqual(['guaranteed', '#1'])
    expect(guidelines.readingLevel).toBe(8)
  })

  it('replaces on a second write instead of creating a duplicate row', async () => {
    // The unique constraint means a select-then-insert would 500 here under a race; the route
    // upserts. Asserted through the API rather than the DB so the guarantee is the observable one.
    await put({ tone: 'playful', bannedTerms: ['cheap'] })
    const { guidelines } = JSON.parse((await get(ownerCookie)).body)

    expect(guidelines.tone).toBe('playful')
    expect(guidelines.bannedTerms).toEqual(['cheap'])

    const rows = await db
      .select()
      .from(schema.brandGuidelines)
      .where(eq(schema.brandGuidelines.workspaceId, workspaceId))
    expect(rows).toHaveLength(1)
  })

  describe('normalization', () => {
    it('drops blank terms, which would otherwise match every string', async () => {
      // An empty banned term compiles to a regex matching anything, so one stray blank row in the
      // UI would silently drop every generated variant. This is the regression case for that.
      await put({ bannedTerms: ['  ', '', 'spam'] })
      const { guidelines } = JSON.parse((await get(ownerCookie)).body)
      expect(guidelines.bannedTerms).toEqual(['spam'])
    })

    it('de-duplicates case-insensitively, keeping the first spelling', async () => {
      await put({ bannedTerms: ['Spam', 'spam', 'SPAM'] })
      const { guidelines } = JSON.parse((await get(ownerCookie)).body)
      expect(guidelines.bannedTerms).toEqual(['Spam'])
    })

    it('normalizes an empty persona string to null', async () => {
      await put({ targetPersona: '   ' })
      const { guidelines } = JSON.parse((await get(ownerCookie)).body)
      expect(guidelines.targetPersona).toBeNull()
    })
  })

  describe('validation', () => {
    it('refuses an unknown tone rather than storing one the engine cannot honour', async () => {
      const res = await put({ tone: 'sarcastic' })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).error.code).toBe('VALIDATION_ERROR')
    })

    it.each([
      [0, 'below the grade scale'],
      [21, 'above the grade scale'],
      [7.5, 'not an integer grade'],
    ])('refuses readingLevel %s (%s)', async (readingLevel) => {
      const res = await put({ readingLevel })
      expect(res.statusCode).toBe(400)
    })

    it('accepts an explicit null readingLevel as "unconstrained"', async () => {
      // Distinct from 0, which is refused: "no constraint" and "grade zero" are different states.
      const res = await put({ readingLevel: null })
      expect(res.statusCode).toBe(200)
      expect(JSON.parse((await get(ownerCookie)).body).guidelines.readingLevel).toBeNull()
    })
  })

  describe('authorization', () => {
    it('rejects an anonymous read', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${workspaceId}/brand-guidelines`,
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects a signed-in non-member', async () => {
      expect((await get(outsiderCookie)).statusCode).toBe(403)
      expect((await put({ tone: 'bold' }, outsiderCookie)).statusCode).toBe(403)
    })
  })
})
