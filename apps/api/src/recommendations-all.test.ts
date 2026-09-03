import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureAllRecommendations } from './recommendations.js'

// Integration: unified queue spans every generator type.
describe('ensureAllRecommendations', () => {
  const ws = 'test-all-recs-ws'
  afterAll(async () => {
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  })

  it('generates all types once, idempotent, ordered by composite', async () => {
    await db.delete(schema.contentBriefs).where(eq(schema.contentBriefs.workspaceId, ws))
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

    const first = await ensureAllRecommendations(ws)
    const types = new Set(first.map((r) => r.type))
    expect(types.has('cross_channel')).toBe(true)
    expect(types.has('paid_to_organic')).toBe(true)
    expect(types.has('organic_to_paid')).toBe(true)
    expect(types.has('fatigue_alert')).toBe(true)

    const ordered = first.every((r, i) => i === 0 || first[i - 1]!.compositeScore >= r.compositeScore)
    expect(ordered).toBe(true)

    const second = await ensureAllRecommendations(ws)
    expect(second.length).toBe(first.length) // idempotent across all generators
  }, 30000) // integration: many sequential inserts against remote Neon

  it('lists no job twice, and keeps the specialised row over the cross-channel one', async () => {
    const recs = await ensureAllRecommendations(ws)

    // The cross-channel engine's GoogleAds->SEO rule and `ensurePaidToOrganic` read the same
    // analysed search terms and emit the identical title, so the queue used to carry each of these
    // jobs twice at two different priorities. `dedupeAgainstSpecialisedRows` resolves it.
    const titles = recs.map((r) => r.title)
    expect(new Set(titles).size).toBe(titles.length)

    // The survivor must be the specialised row: it scores impact from real conversion volume and
    // owns the linked content brief. Deleting it and keeping the coarse cross-channel copy would
    // orphan the brief.
    const seo = recs.filter((r) => r.title.startsWith('Create SEO content for'))
    expect(seo.length).toBeGreaterThan(0)
    for (const r of seo) expect(r.type).toBe('paid_to_organic')
  }, 30000)

  it('orders deterministically, since composite alone is a near-tie', async () => {
    // Most of this queue shares a composite score, so ordering by that column alone left the bulk
    // of it arranged by whatever Postgres returned. The order must be stable across reads.
    const a = await ensureAllRecommendations(ws)
    const b = await ensureAllRecommendations(ws)
    expect(b.map((r) => r.id)).toEqual(a.map((r) => r.id))

    const ordered = a.every(
      (r, i) =>
        i === 0 ||
        a[i - 1]!.compositeScore > r.compositeScore ||
        (a[i - 1]!.compositeScore === r.compositeScore &&
          a[i - 1]!.effortScore <= r.effortScore),
    )
    expect(ordered).toBe(true)
  }, 30000)

  it('returns the fields the queue renders', async () => {
    const [rec] = await ensureAllRecommendations(ws)
    expect(rec).toBeDefined()
    // These were all persisted and none reached the API response, so the page could not show a
    // comment count, an age, or when a snoozed item comes back.
    expect(rec).toHaveProperty('commentCount')
    expect(rec).toHaveProperty('createdAt')
    expect(rec).toHaveProperty('snoozedUntil')
    expect(rec).toHaveProperty('actedAt')
    expect(typeof rec!.commentCount).toBe('number')
  }, 30000)
})
