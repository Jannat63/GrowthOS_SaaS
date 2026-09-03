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
    const terms = getScoredSearchTerms(ws)
    expect(terms.length).toBeGreaterThan(0)
    expect(terms.some((t) => t.recommendationType === 'paid-proven-organic-needed')).toBe(true)
  })

  it('varies numbers by workspace (not the same fixture for everyone) but keeps them deterministic', () => {
    const a1 = getScoredSearchTerms('workspace-aaa')
    const a2 = getScoredSearchTerms('workspace-aaa')
    const b = getScoredSearchTerms('workspace-bbb')

    expect(a1).toEqual(a2) // same workspace, same call twice -> identical (deterministic)
    expect(a1).not.toEqual(b) // different workspace -> different numbers
    // The categorical signal (does this term rank organically at all?) must NOT drift with the
    // workspace — only the performance numbers are sample-varied, not the recommendation logic.
    expect(a1.map((t) => t.organicPosition)).toEqual(b.map((t) => t.organicPosition))
    expect(a1.map((t) => t.term)).toEqual(b.map((t) => t.term))
  })

  it('generates paid_to_organic recs + briefs, idempotently', async () => {
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

    await ensurePaidToOrganic(ws)
    const recs1 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    const briefs1 = await getContentBriefs(ws, { limit: 100, offset: 0 })
    expect(recs1.length).toBeGreaterThanOrEqual(1)
    expect(briefs1.data.length).toBe(recs1.length)
    // `total` counts every brief in the workspace, not just the page that was returned.
    expect(briefs1.total).toBe(recs1.length)

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
