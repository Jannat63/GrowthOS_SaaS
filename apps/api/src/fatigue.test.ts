import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { ensureFatigueAlerts, getFatigueResults } from './fatigue.js'

describe('creative fatigue', () => {
  const ws = 'test-fatigue-ws'
  afterAll(async () => {
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
  })

  it('scores creatives and flags fatigue', () => {
    const results = getFatigueResults()
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.status === 'fatigued')).toBe(true)
  })

  it('generates fatigue_alert recs for non-healthy creatives, idempotently', async () => {
    await db.delete(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))

    await ensureFatigueAlerts(ws)
    const recs1 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    const nonHealthy = getFatigueResults().filter((r) => r.status !== 'healthy').length
    expect(recs1.length).toBe(nonHealthy)
    expect(recs1.every((r) => r.type === 'fatigue_alert')).toBe(true)

    await ensureFatigueAlerts(ws)
    const recs2 = await db.select().from(schema.recommendations).where(eq(schema.recommendations.workspaceId, ws))
    expect(recs2.length).toBe(recs1.length)
  })
})
