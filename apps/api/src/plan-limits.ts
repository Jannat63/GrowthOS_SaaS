import { and, eq, sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { PLAN_LIMITS, type BooleanFeature, type CountedMetric, type UsageSummary } from '@growthos/types'
import { AppError } from './errors.js'
import { getCurrentSubscription } from './billing.js'

/**
 * Plan-limit enforcement (M5 P5.2), built on the `usage_records` table from P5.1.
 *
 * Two kinds of limits in PLAN_LIMITS (see @growthos/types):
 *
 *  - Boolean feature gates (whiteLabel, geoTracking, apiAccess) — checked directly against the
 *    workspace's current plan; no usage_records involved. `assertFeatureEnabled` covers these.
 *    Wired in: white-label branding (routes/v1.ts PATCH .../branding).
 *
 *  - Rolling-window counters (recommendationsPerWeek, aiCreativesPerMonth) — `recordUsage`
 *    increments the counter each time the metered action happens; `assertWithinLimit` checks it
 *    beforehand. `period` is the window's start date, so each metric resets automatically.
 *    NOT WIRED IN YET: both actions are currently produced by idempotent "ensure" helpers
 *    (`ensureAllRecommendations`) called from read/list routes, not from a repeatable
 *    user-triggered write — metering a read path would 402 people out of their own dashboard. A
 *    real per-action generation endpoint doesn't exist until the scheduled Intelligence Engine
 *    loop (M3 P3.4 remainder) or AI creative automation (M4 P4.2) land. This module is ready the
 *    moment those endpoints exist — call `assertWithinLimit` before generating, `recordUsage`
 *    after it succeeds.
 *
 * `trackedKeywords`, `teamMembers`, and `workspaces` are live counts against real data rather
 * than incrementing counters, and also have no write endpoint yet (keyword tracking, team
 * invites, and multi-workspace agency management aren't built) — same status, same fix.
 */

type PlanLimitKey = 'recommendationsPerWeek' | 'aiCreativesPerMonth'

const METRIC_LIMIT_KEY: Record<CountedMetric, PlanLimitKey> = {
  recommendations_generated: 'recommendationsPerWeek',
  ai_creatives_generated: 'aiCreativesPerMonth',
}

/** Start of the current reset window for a metric, UTC. Weekly metrics reset Monday; monthly metrics reset the 1st. */
function periodStart(metric: CountedMetric): Date {
  const now = new Date()
  if (METRIC_LIMIT_KEY[metric] === 'recommendationsPerWeek') {
    const daysSinceMonday = (now.getUTCDay() + 6) % 7
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday))
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/** Current usage for a metric's active window (0 if nothing recorded yet). */
export async function getUsage(workspaceId: string, metric: CountedMetric): Promise<number> {
  const [row] = await db
    .select({ value: schema.usageRecords.value })
    .from(schema.usageRecords)
    .where(
      and(
        eq(schema.usageRecords.workspaceId, workspaceId),
        eq(schema.usageRecords.metric, metric),
        eq(schema.usageRecords.period, periodStart(metric)),
      ),
    )
    .limit(1)
  return row?.value ?? 0
}

/** Throws PLAN_LIMIT_REACHED (402) if the workspace is at or over its limit. Call before the metered action runs. */
export async function assertWithinLimit(workspaceId: string, metric: CountedMetric): Promise<void> {
  const { plan } = await getCurrentSubscription(workspaceId)
  const limit = PLAN_LIMITS[plan][METRIC_LIMIT_KEY[metric]]
  if (limit === Infinity) return
  const used = await getUsage(workspaceId, metric)
  if (used >= limit) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `You've reached your ${plan} plan's limit (${limit}) for this feature this ${
        METRIC_LIMIT_KEY[metric] === 'recommendationsPerWeek' ? 'week' : 'month'
      }. Upgrade to continue.`,
    )
  }
}

/** Increments usage for the metric's current window. Call after the metered action succeeds. */
export async function recordUsage(workspaceId: string, metric: CountedMetric, incrementBy = 1): Promise<void> {
  const period = periodStart(metric)
  await db
    .insert(schema.usageRecords)
    .values({ workspaceId, metric, period, value: incrementBy })
    .onConflictDoUpdate({
      target: [schema.usageRecords.workspaceId, schema.usageRecords.metric, schema.usageRecords.period],
      set: { value: sql`${schema.usageRecords.value} + ${incrementBy}`, updatedAt: new Date() },
    })
}

/** Throws PLAN_LIMIT_REACHED (402) if a boolean feature isn't included in the workspace's plan. */
export async function assertFeatureEnabled(workspaceId: string, feature: BooleanFeature): Promise<void> {
  const { plan } = await getCurrentSubscription(workspaceId)
  if (!PLAN_LIMITS[plan][feature]) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `This feature isn't included in the ${plan} plan. Upgrade to Growth or Scale to unlock it.`,
    )
  }
}

/** Full usage-vs-limit breakdown for the Billing settings page. `limit: null` means unlimited (Infinity isn't valid JSON). */
export async function getUsageSummary(workspaceId: string): Promise<UsageSummary> {
  const { plan } = await getCurrentSubscription(workspaceId)
  const metricKeys = Object.keys(METRIC_LIMIT_KEY) as CountedMetric[]
  const metrics = await Promise.all(
    metricKeys.map(async (metric) => {
      const rawLimit = PLAN_LIMITS[plan][METRIC_LIMIT_KEY[metric]]
      return {
        metric,
        used: await getUsage(workspaceId, metric),
        limit: rawLimit === Infinity ? null : rawLimit,
      }
    }),
  )
  const features = (['whiteLabel', 'geoTracking', 'apiAccess'] as BooleanFeature[]).map((feature) => ({
    feature,
    enabled: Boolean(PLAN_LIMITS[plan][feature]),
  }))
  return { plan, metrics, features }
}
