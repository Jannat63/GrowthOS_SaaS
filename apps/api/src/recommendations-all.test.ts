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
})
