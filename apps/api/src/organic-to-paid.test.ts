import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureOrganicToPaid, getTopOrganicPages } from './organic-to-paid.js'

describe('organic-to-paid', () => {
  const ws = 'test-o2p-ws'
  afterAll(async () => {
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  })

  it('returns scored top organic pages', () => {
    const pages = getTopOrganicPages()
    expect(pages.length).toBeGreaterThan(0)
    expect(pages.every((p) => p.currentPosition !== null)).toBe(true)
  })

  it('generates organic_to_paid recs + creative briefs, idempotently', async () => {
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

    await ensureOrganicToPaid(ws)
    const recs1 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    const briefs1 = await db.select().from(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    expect(recs1.length).toBeGreaterThanOrEqual(1)
    expect(briefs1.length).toBe(recs1.length)
    expect(recs1.every((r) => r.type === 'organic_to_paid')).toBe(true)

    await ensureOrganicToPaid(ws)
    const recs2 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    expect(recs2.length).toBe(recs1.length)
  })
})
