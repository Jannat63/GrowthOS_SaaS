import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { buildApp } from '../app.js'

// Integration: requires Neon (dev stack up) — same as ws.test.ts / public-api.test.ts. Real
// signups, real session cookies, real HTTP round-trips through app.inject() — the genuine
// signup → invite → accept path, not the invitations.ts unit-level tests in isolation.
describe('team invitation routes', () => {
  const app = buildApp()
  const growthSlug = `test-invite-routes-growth-${Date.now()}`
  const starterWs = `test-invite-routes-starter-${Date.now()}`

  let growthWorkspaceId: string
  let ownerCookie: string
  let ownerId: string
  let inviteeCookie: string
  let inviteeId: string
  let inviteeEmail: string
  let thirdCookie: string
  let thirdEmail: string

  afterAll(async () => {
    await app.close()
    if (growthWorkspaceId) await db.delete(schema.workspaces).where(eq(schema.workspaces.id, growthWorkspaceId))
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, starterWs))
    for (const id of [ownerId, inviteeId]) {
      if (id) await db.delete(schema.user).where(eq(schema.user.id, id))
    }
  })

  // Setup as a hook, not a test — see ws.test.ts's comment on why: every case below depends on
  // this state, and a setup failure inside an it() surfaces as a confusing cascade in later tests
  // rather than a single, real error naming what actually broke.
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
      const userId = JSON.parse(me.body).user.id as string
      return { cookie, userId }
    }

    const owner = await signUp(`invite-owner-${Date.now()}@example.com`, 'Invite Owner')
    ownerCookie = owner.cookie
    ownerId = owner.userId

    // Through the real endpoint, not a raw insert — this is what seats the owner as an actual
    // 'owner' workspace_members row (see ws.test.ts for the same reasoning).
    const createWs = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: 'Invite Routes Test', slug: growthSlug },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })
    expect(createWs.statusCode).toBe(201)
    growthWorkspaceId = JSON.parse(createWs.body).workspace.id
    expect(growthWorkspaceId).toBeTruthy()

    // POST /workspaces fires startTrial(workspace.id) fire-and-forget (see v1.ts) rather than
    // awaiting it, so the plan flip to 'growth' can still be in flight the instant this resolves.
    // Every test below needs the growth plan (5 seats) actually in effect — a raw poll here is
    // simpler and more honest than a fixed sleep guessing how long the insert takes.
    for (let i = 0; i < 20; i++) {
      const [ws] = await db.select({ plan: schema.workspaces.plan }).from(schema.workspaces).where(eq(schema.workspaces.id, growthWorkspaceId))
      if (ws?.plan === 'growth') break
      await new Promise((r) => setTimeout(r, 100))
    }

    inviteeEmail = `invite-invitee-${Date.now()}@example.com`
    const invitee = await signUp(inviteeEmail, 'Invite Invitee')
    inviteeCookie = invitee.cookie
    inviteeId = invitee.userId

    thirdEmail = `invite-third-${Date.now()}@example.com`
    const third = await signUp(thirdEmail, 'Invite Third')
    thirdCookie = third.cookie
  })

  let invitationId: string

  it('rejects a non-member creating an invitation (403, not even a 404 that would leak existence)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${growthWorkspaceId}/invitations`,
      payload: { email: inviteeEmail, role: 'admin' },
      headers: { cookie: thirdCookie, 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('owner creates a pending admin invitation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${growthWorkspaceId}/invitations`,
      payload: { email: inviteeEmail, role: 'admin' },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.email).toBe(inviteeEmail.toLowerCase())
    expect(body.role).toBe('admin')
    expect(body.status).toBe('pending')
    invitationId = body.id
    expect(invitationId).toBeTruthy()
  })

  it('lists the pending invitation for workspace admins', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${growthWorkspaceId}/invitations`,
      headers: { cookie: ownerCookie },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.some((i: { id: string }) => i.id === invitationId)).toBe(true)
  })

  it('serves the unauthenticated preview with no cookie at all', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/invitations/${invitationId}` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toEqual({
      id: invitationId,
      email: inviteeEmail.toLowerCase(),
      role: 'admin',
      status: 'pending',
      workspaceName: 'Invite Routes Test',
      workspaceSlug: growthSlug,
    })
  })

  it('rejects a signed-in user accepting an invitation sent to a different email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/invitations/${invitationId}/accept`,
      headers: { cookie: thirdCookie },
    })
    expect(res.statusCode).toBe(403)
  })

  it('the invitee accepts and is seated as admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/invitations/${invitationId}/accept`,
      headers: { cookie: inviteeCookie },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toEqual({ workspaceId: growthWorkspaceId, workspaceSlug: growthSlug, role: 'admin' })

    const members = await app.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${growthWorkspaceId}/members`,
      headers: { cookie: ownerCookie },
    })
    const memberBody = JSON.parse(members.body)
    expect(memberBody.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: inviteeId, role: 'admin' })]),
    )
  })

  it('rejects re-accepting the same invitation a second time', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/invitations/${invitationId}/accept`,
      headers: { cookie: inviteeCookie },
    })
    expect(res.statusCode).toBe(400)
  })

  it('blocks the newly-admin invitee from inviting someone as owner — outranks their own role', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${growthWorkspaceId}/invitations`,
      payload: { email: thirdEmail, role: 'owner' },
      headers: { cookie: inviteeCookie, 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('lets the admin invitee invite someone at a lower rank (viewer)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${growthWorkspaceId}/invitations`,
      payload: { email: thirdEmail, role: 'viewer' },
      headers: { cookie: inviteeCookie, 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(201)

    const revoke = await app.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${growthWorkspaceId}/invitations/${JSON.parse(res.body).id}`,
      headers: { cookie: ownerCookie },
    })
    expect(revoke.statusCode).toBe(200)
  })

  it('402s once a starter-plan workspace is already at its 1-seat cap', async () => {
    // Deliberately a raw fixture, not the real POST /workspaces endpoint — that always fires
    // startTrial (growth), so there's no way to land on 'starter' through the real flow. Same
    // pattern as plan-limits.test.ts's own() helper.
    await db.insert(schema.workspaces).values({ id: starterWs, name: starterWs, slug: starterWs, createdAt: new Date() }).onConflictDoNothing()
    await db
      .insert(schema.workspace_members)
      .values({ id: `${starterWs}-owner`, organizationId: starterWs, userId: ownerId, role: 'owner', createdAt: new Date() })
      .onConflictDoNothing()

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${starterWs}/invitations`,
      payload: { email: thirdEmail, role: 'viewer' },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(402)
    expect(JSON.parse(res.body).error.code).toBe('PLAN_LIMIT_REACHED')
  })
})
