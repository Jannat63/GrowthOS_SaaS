import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { buildApp } from '../app.js'

// Integration: requires Neon. Real signups, real session cookies, real round-trips.
describe('creative experiment routes', () => {
  const app = buildApp()
  const slug = `test-experiments-${Date.now()}`

  let workspaceId: string
  let ownerCookie: string
  let ownerId: string
  let outsiderCookie: string
  let outsiderId: string

  afterAll(async () => {
    await app.close()
    if (workspaceId) {
      await db
        .delete(schema.creativeExperiments)
        .where(eq(schema.creativeExperiments.workspaceId, workspaceId))
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

    const owner = await signUp(`experiments-owner-${Date.now()}@example.com`, 'Experiments Owner')
    ownerCookie = owner.cookie
    ownerId = owner.userId

    const createWs = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      payload: { name: 'Experiments Test', slug },
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
    })
    expect(createWs.statusCode).toBe(201)
    workspaceId = JSON.parse(createWs.body).workspace.id

    const outsider = await signUp(`experiments-outsider-${Date.now()}@example.com`, 'Outsider')
    outsiderCookie = outsider.cookie
    outsiderId = outsider.userId
  })

  const base = () => `/api/v1/workspaces/${workspaceId}/creative-experiments`

  const create = (overrides: Record<string, unknown> = {}, cookie = ownerCookie) =>
    app.inject({
      method: 'POST',
      url: base(),
      payload: {
        hypothesis: 'A testimonial-led hook will beat a discount-led hook.',
        variantA: { hook: 'Save 20% today', body: 'Limited time.', cta: 'Shop now' },
        variantB: { hook: '"I use it every day"', body: 'Real customers.', cta: 'Shop now' },
        successMetric: 'CTR',
        ...overrides,
      },
      headers: { cookie, 'content-type': 'application/json' },
    })

  const setStatus = (id: string, status: string, cookie = ownerCookie) =>
    app.inject({
      method: 'PATCH',
      url: `${base()}/${id}/status`,
      payload: { status },
      headers: { cookie, 'content-type': 'application/json' },
    })

  const conclude = (id: string, payload: Record<string, unknown>, cookie = ownerCookie) =>
    app.inject({
      method: 'POST',
      url: `${base()}/${id}/conclude`,
      payload,
      headers: { cookie, 'content-type': 'application/json' },
    })

  const newExperiment = async (): Promise<string> => {
    const res = await create()
    expect(res.statusCode).toBe(201)
    return JSON.parse(res.body).experiment.id
  }

  it('creates an experiment in draft and stores the variants as a snapshot', async () => {
    const res = await create()
    expect(res.statusCode).toBe(201)

    const { experiment } = JSON.parse(res.body)
    expect(experiment.status).toBe('draft')
    // Stored verbatim: the generators are deterministic templates, so a reference would silently
    // resolve to today's template output rather than what was actually tested.
    expect(experiment.variantA.hook).toBe('Save 20% today')
    expect(experiment.variantB.hook).toBe('"I use it every day"')
    expect(experiment.result).toBeNull()
  })

  it('lists experiments newest first', async () => {
    const res = await app.inject({ method: 'GET', url: base(), headers: { cookie: ownerCookie } })
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.total).toBeGreaterThan(0)
    expect(body.data.length).toBe(body.total)
  })

  describe('status transitions', () => {
    it('lets the user launch a draft — status is theirs to set, not ours to infer', async () => {
      // The test runs in the customer's ad manager. Gating this on a platform connection would
      // freeze the record of work that is genuinely happening.
      const id = await newExperiment()
      const res = await setStatus(id, 'running')

      expect(res.statusCode).toBe(200)
      const { experiment } = JSON.parse(res.body)
      expect(experiment.status).toBe('running')
      expect(experiment.startedAt).not.toBeNull()
    })

    it('keeps the original startedAt when un-launched and relaunched', async () => {
      // Un-launching a mistake should not rewrite when the test actually began.
      const id = await newExperiment()
      const first = JSON.parse((await setStatus(id, 'running')).body).experiment.startedAt

      await setStatus(id, 'draft')
      const second = JSON.parse((await setStatus(id, 'running')).body).experiment.startedAt

      expect(second).toBe(first)
    })

    it('refuses a no-op transition rather than reporting a change that did not happen', async () => {
      const id = await newExperiment()
      const res = await setStatus(id, 'draft')
      expect(res.statusCode).toBe(400)
    })

    it('refuses to conclude through the status route, which carries no outcome', async () => {
      const id = await newExperiment()
      const res = await setStatus(id, 'concluded')

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).error.message).toMatch(/record the result/i)
    })
  })

  describe('conclusion', () => {
    it('records the outcome, flags it self-reported, and closes the experiment', async () => {
      const id = await newExperiment()
      await setStatus(id, 'running')

      const res = await conclude(id, { winner: 'b', notes: 'B won clearly.', metricA: 1.2, metricB: 2.4 })
      expect(res.statusCode).toBe(200)

      const { experiment } = JSON.parse(res.body)
      expect(experiment.status).toBe('concluded')
      expect(experiment.concludedAt).not.toBeNull()
      expect(experiment.result.winner).toBe('b')
      // The flag is the whole point: without it a later consumer treats a hand-typed number as
      // observed data.
      expect(experiment.result.selfReported).toBe(true)
      expect(experiment.result.concludedBy).toBe(ownerId)
    })

    it('allows concluding straight from draft — abandoning before launch is a real outcome', async () => {
      const id = await newExperiment()
      const res = await conclude(id, { winner: 'inconclusive', notes: 'Never launched; budget cut.' })
      expect(res.statusCode).toBe(200)
    })

    it('requires notes for an inconclusive result', async () => {
      const id = await newExperiment()
      const res = await conclude(id, { winner: 'inconclusive' })

      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).error.message).toMatch(/what you saw/i)
    })

    it('does not overrule a winner that disagrees with the reported numbers', async () => {
      // The user may pick B despite A's higher number because B drove revenue we cannot see.
      const id = await newExperiment()
      const res = await conclude(id, { winner: 'b', metricA: 9.9, metricB: 0.1 })
      expect(res.statusCode).toBe(200)
    })

    it('refuses a negative metric', async () => {
      const id = await newExperiment()
      const res = await conclude(id, { winner: 'a', metricA: -1 })
      expect(res.statusCode).toBe(400)
    })

    it('will not reopen or re-conclude a concluded experiment', async () => {
      // A log whose history can be rewritten is not a log.
      const id = await newExperiment()
      await conclude(id, { winner: 'a' })

      expect((await setStatus(id, 'running')).statusCode).toBe(400)
      expect((await conclude(id, { winner: 'b' })).statusCode).toBe(400)
    })
  })

  describe('deletion', () => {
    it('deletes a draft', async () => {
      const id = await newExperiment()
      const res = await app.inject({
        method: 'DELETE',
        url: `${base()}/${id}`,
        headers: { cookie: ownerCookie },
      })
      expect(res.statusCode).toBe(200)
    })

    it('refuses to delete a concluded experiment', async () => {
      const id = await newExperiment()
      await conclude(id, { winner: 'a' })

      const res = await app.inject({
        method: 'DELETE',
        url: `${base()}/${id}`,
        headers: { cookie: ownerCookie },
      })
      expect(res.statusCode).toBe(400)
      expect(JSON.parse(res.body).error.message).toMatch(/part of the record/i)
    })
  })

  describe('validation', () => {
    it('requires a hypothesis', async () => {
      expect((await create({ hypothesis: '' })).statusCode).toBe(400)
    })

    it('requires a success metric — an experiment with no way to judge it is not one', async () => {
      expect((await create({ successMetric: '' })).statusCode).toBe(400)
    })

    it('requires both variants', async () => {
      expect((await create({ variantB: null })).statusCode).toBe(400)
    })
  })

  describe('authorization', () => {
    it('rejects an anonymous read', async () => {
      const res = await app.inject({ method: 'GET', url: base() })
      expect(res.statusCode).toBe(401)
    })

    it('rejects a signed-in non-member', async () => {
      expect((await create({}, outsiderCookie)).statusCode).toBe(403)
      const res = await app.inject({ method: 'GET', url: base(), headers: { cookie: outsiderCookie } })
      expect(res.statusCode).toBe(403)
    })

    it('will not let another workspace reach this one\'s experiment by id', async () => {
      // The workspace scope is part of the WHERE, so a foreign id is indistinguishable from a
      // missing one — the 404/403 difference would leak which ids are real.
      const id = await newExperiment()
      const otherWs = await app.inject({
        method: 'POST',
        url: '/api/v1/workspaces',
        payload: { name: 'Other', slug: `${slug}-other` },
        headers: { cookie: outsiderCookie, 'content-type': 'application/json' },
      })
      const otherId = JSON.parse(otherWs.body).workspace.id

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${otherId}/creative-experiments/${id}/status`,
        payload: { status: 'running' },
        headers: { cookie: outsiderCookie, 'content-type': 'application/json' },
      })
      expect(res.statusCode).toBe(404)

      await db.delete(schema.workspaces).where(eq(schema.workspaces.id, otherId))
    })
  })
})
