import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { listComments, addComment, assignRecommendation } from './collaboration.js'
import { MAX_LIMIT } from './pagination.js'

const PAGE = { limit: MAX_LIMIT, offset: 0 }

// Integration: requires Neon (dev stack up).
describe('recommendation collaboration', () => {
  const ws = 'test-collab-ws'
  let recId = ''

  beforeAll(async () => {
    const [rec] = await db
      .insert(schema.recommendations)
      .values({
        workspaceId: ws,
        type: 'cross_channel',
        sourceChannel: 'seo',
        targetChannel: 'google',
        title: 'Test rec',
        body: 'Body',
        impactScore: 50,
        effortScore: 20,
        urgencyScore: 30,
        compositeScore: 60,
      })
      .returning({ id: schema.recommendations.id })
    recId = rec!.id
  })

  afterAll(async () => {
    await db.delete(schema.recommendationComments).where(eq(schema.recommendationComments.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  })

  it('adds and lists comments oldest-first', async () => {
    const c1 = await addComment(ws, recId, 'user-a', 'First comment')
    const c2 = await addComment(ws, recId, 'user-b', 'Second comment')
    expect(c1).not.toBeNull()
    expect(c2).not.toBeNull()

    const list = await listComments(ws, recId, PAGE)
    expect(list).not.toBeNull()
    expect(list!.data.map((c) => c.body)).toEqual(['First comment', 'Second comment'])
    expect(list!.total).toBe(2)
  })

  it('pages the thread and reports the full total, not the page size', async () => {
    const firstPage = await listComments(ws, recId, { limit: 1, offset: 0 })
    expect(firstPage!.data.map((c) => c.body)).toEqual(['First comment'])
    expect(firstPage!.total).toBe(2)

    const secondPage = await listComments(ws, recId, { limit: 1, offset: 1 })
    expect(secondPage!.data.map((c) => c.body)).toEqual(['Second comment'])
    expect(secondPage!.total).toBe(2)
  })

  it('assigns and unassigns a recommendation', async () => {
    expect(await assignRecommendation(ws, recId, 'user-a', null)).toBe(true)
    const [row1] = await db
      .select({ assignedTo: schema.recommendations.assignedTo })
      .from(schema.recommendations)
      .where(eq(schema.recommendations.id, recId))
    expect(row1!.assignedTo).toBe('user-a')

    expect(await assignRecommendation(ws, recId, null, null)).toBe(true)
    const [row2] = await db
      .select({ assignedTo: schema.recommendations.assignedTo })
      .from(schema.recommendations)
      .where(eq(schema.recommendations.id, recId))
    expect(row2!.assignedTo).toBeNull()
  })

  it('rejects collaboration on a rec outside the workspace', async () => {
    expect(await listComments('other-ws', recId, PAGE)).toBeNull()
    expect(await addComment('other-ws', recId, 'user-a', 'nope')).toBeNull()
    expect(await assignRecommendation('other-ws', recId, 'user-a', null)).toBe(false)
  })
})
