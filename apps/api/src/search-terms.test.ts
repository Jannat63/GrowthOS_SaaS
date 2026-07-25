import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import {
  ensurePaidToOrganic,
  getScoredSearchTerms,
  getContentBriefs,
  updateRecommendationStatus,
} from './search-terms.js'

// Integration: requires Neon (dev stack up).
describe('paid-to-organic', () => {
  const ws = 'test-p2o-ws'
  afterAll(async () => {
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  })

  it('scores search terms', () => {
    const terms = getScoredSearchTerms()
    expect(terms.length).toBeGreaterThan(0)
    expect(terms.some((t) => t.recommendationType === 'paid-proven-organic-needed')).toBe(true)
  })

  it('generates paid_to_organic recs + briefs, idempotently', async () => {
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

    await ensurePaidToOrganic(ws)
    const recs1 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    const briefs1 = await getContentBriefs(ws)
    expect(recs1.length).toBeGreaterThanOrEqual(1)
    expect(briefs1.length).toBe(recs1.length)

    await ensurePaidToOrganic(ws) // idempotent
    const recs2 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    expect(recs2.length).toBe(recs1.length)
  })

  it('updates recommendation status with timestamps', async () => {
    const [rec] = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    await updateRecommendationStatus(ws, rec!.id, 'acted')
    const [acted] = await db.select().from(schema.recommendations).where(eq(schema.recommendations.id, rec!.id))
    expect(acted!.status).toBe('acted')
    expect(acted!.actedAt).not.toBeNull()
  })
})
