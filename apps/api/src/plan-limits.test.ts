import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { startTrial } from './billing.js'
import {
  assertCanCreateWorkspace,
  assertFeatureEnabled,
  assertWithinLimit,
  getRemainingAllowance,
  getUsage,
  getUsageSummary,
  recordUsage,
} from './plan-limits.js'

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

  describe('getRemainingAllowance', () => {
    it('reports Infinity for an unlimited plan, so callers can skip metering entirely', async () => {
      expect(await getRemainingAllowance(growthWs, 'recommendations_generated')).toBe(Infinity)
    })

    it('floors at 0 rather than going negative once a capped plan is over its limit', async () => {
      // starterWs sits at 5/5 from the assertWithinLimit test above; push it past the cap.
      await recordUsage(starterWs, 'recommendations_generated', 3)
      expect(await getRemainingAllowance(starterWs, 'recommendations_generated')).toBe(0)
    })
  })

  describe('assertCanCreateWorkspace', () => {
    const userId = 'test-planlimit-user'
    const firstWs = 'test-planlimit-owned-1'
    const secondWs = 'test-planlimit-owned-2'

    const own = async (workspaceId: string, plan: string) => {
      await db
        .insert(schema.workspaces)
        .values({ id: workspaceId, name: workspaceId, slug: workspaceId, plan, createdAt: new Date() })
        .onConflictDoNothing()
      await db
        .insert(schema.workspace_members)
        .values({
          id: `${workspaceId}-member`,
          organizationId: workspaceId,
          userId,
          role: 'owner',
          createdAt: new Date(),
        })
        .onConflictDoNothing()
    }

    afterAll(async () => {
      // workspace_members cascades from workspaces, which cascades from nothing — delete both, then the user.
      for (const id of [firstWs, secondWs]) {
        await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id))
      }
      await db.delete(schema.user).where(eq(schema.user.id, userId))
    })

    it('allows a user who owns nothing to create their first workspace', async () => {
      await db
        .insert(schema.user)
        .values({
          id: userId,
          name: 'Plan Limit User',
          email: `${userId}@example.com`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
      await expect(assertCanCreateWorkspace(userId)).resolves.toBeUndefined()
    })

    it("blocks a second workspace once the user's only plan is starter (limit 1)", async () => {
      await own(firstWs, 'starter')
      await expect(assertCanCreateWorkspace(userId)).rejects.toThrow(/plan includes 1 workspace/)
    })

    it('lets the most generous owned plan govern — a growth workspace lifts the cap to 5', async () => {
      await own(secondWs, 'growth')
      await expect(assertCanCreateWorkspace(userId)).resolves.toBeUndefined()
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
