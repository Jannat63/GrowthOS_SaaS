import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { startTrial } from './billing.js'
import { assertFeatureEnabled, assertWithinLimit, getUsage, getUsageSummary, recordUsage } from './plan-limits.js'

// Integration: requires Neon (dev stack up) — same as billing.test.ts.
describe('plan-limits', () => {
  const starterWs = 'test-planlimit-starter-ws'
  const growthWs = 'test-planlimit-growth-ws'

  afterAll(async () => {
    await db.delete(schema.usageRecords).where(eq(schema.usageRecords.workspaceId, starterWs))
    await db.delete(schema.usageRecords).where(eq(schema.usageRecords.workspaceId, growthWs))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.workspaceId, growthWs))
  })

  it('recordUsage increments within the current window, getUsage reads it back', async () => {
    await recordUsage(starterWs, 'recommendations_generated')
    await recordUsage(starterWs, 'recommendations_generated', 2)
    expect(await getUsage(starterWs, 'recommendations_generated')).toBe(3)
  })

  it('assertWithinLimit throws PLAN_LIMIT_REACHED once the starter cap (5/week) is hit', async () => {
    // Already at 3 from the previous test; two more reaches the starter plan's cap of 5.
    await recordUsage(starterWs, 'recommendations_generated', 2)
    await expect(assertWithinLimit(starterWs, 'recommendations_generated')).rejects.toThrow(
      /reached your starter plan's limit/,
    )
  })

  it('never throws for unlimited (Infinity) plan limits', async () => {
    await db
      .insert(schema.workspaces)
      .values({ id: growthWs, name: 'Plan Limit Test', slug: growthWs, createdAt: new Date() })
      .onConflictDoNothing()
    await startTrial(growthWs) // Growth plan — recommendationsPerWeek is Infinity.

    for (let i = 0; i < 10; i++) await recordUsage(growthWs, 'recommendations_generated')
    await expect(assertWithinLimit(growthWs, 'recommendations_generated')).resolves.toBeUndefined()
  })

  describe('assertFeatureEnabled', () => {
    it('rejects a starter-plan workspace for a Growth+ feature (whiteLabel)', async () => {
      await expect(assertFeatureEnabled(starterWs, 'whiteLabel')).rejects.toThrow(
        /included in the starter plan/,
      )
    })

    it('allows a Growth-plan workspace through', async () => {
      await expect(assertFeatureEnabled(growthWs, 'whiteLabel')).resolves.toBeUndefined()
    })
  })

  describe('getUsageSummary', () => {
    it('reports null (not Infinity) for unlimited metrics, and the real used/limit for capped ones', async () => {
      const summary = await getUsageSummary(growthWs)
      expect(summary.plan).toBe('growth')
      const recs = summary.metrics.find((m) => m.metric === 'recommendations_generated')
      expect(recs?.limit).toBeNull() // Infinity → null over the wire
      expect(recs?.used).toBe(10)
      expect(summary.features.find((f) => f.feature === 'whiteLabel')?.enabled).toBe(true)
    })
  })
})
