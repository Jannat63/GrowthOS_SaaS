import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureRecommendations } from './recommendations.js'

// Integration: requires Neon (dev stack up).
describe('ensureRecommendations', () => {
  const ws = 'test-recs-ws'
  afterAll(async () => {
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  })

  it('generates on first call and is idempotent + ordered by composite desc', async () => {
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    const first = await ensureRecommendations(ws)
    expect(first.length).toBeGreaterThan(0)

    const second = await ensureRecommendations(ws)
    expect(second.length).toBe(first.length) // no duplication

    const ordered = second.every((r, i) => i === 0 || second[i - 1]!.compositeScore >= r.compositeScore)
    expect(ordered).toBe(true)
  })
})
