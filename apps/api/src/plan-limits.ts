import { and, eq, gt, sql } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { PLAN_LIMITS, type BooleanFeature, type CountedMetric, type Plan, type UsageSummary } from '@growthos/types'
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
 *    `recommendations_generated` is wired in `recommendations.ts` at the point rows are *created*,
 *    never at the point they're read: the generators live behind a list endpoint, and metering the
 *    read would 402 people out of their own dashboard. See `ensureAllRecommendations` for the
 *    degrade-don't-fail shape that makes this safe. `ai_creatives_generated` still has no call site
 *    — that action doesn't exist until M4 P4.2.
 *
 *  - Live counts (`workspaces`, `teamMembers`) — counted at the moment of the gated action rather
 *    than tracked in `usage_records`, since both are really "how many rows exist right now", not a
 *    rolling window. `assertCanCreateWorkspace` counts workspaces the user owns; `assertCanInviteMember`
 *    counts a single workspace's members + pending invitations (see invitations.ts). `trackedKeywords`
 *    still has no write endpoint to gate (keyword tracking isn't built).
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

/**
 * How many more of `metric` this workspace may accrue in the current window; `Infinity` when the
 * plan is unlimited. Preferred over `assertWithinLimit` on paths that must degrade rather than fail
 * — a read endpoint that also generates can consult this, skip the generation, and still serve
 * everything that already exists. Costs one query on unlimited plans (no usage lookup needed).
 */
export async function getRemainingAllowance(
  workspaceId: string,
  metric: CountedMetric,
): Promise<number> {
  const { plan } = await getCurrentSubscription(workspaceId)
  const limit: number = PLAN_LIMITS[plan][METRIC_LIMIT_KEY[metric]]
  if (limit === Infinity) return Infinity
  return Math.max(0, limit - (await getUsage(workspaceId, metric)))
}

/**
 * Throws PLAN_LIMIT_REACHED (402) when the user already owns as many workspaces as their plan
 * allows. Plans hang off a workspace (one subscription per workspace), so "the user's plan" is the
 * most generous plan among the workspaces they own — someone paying for Scale anywhere shouldn't be
 * capped by a Starter workspace they also happen to own. A user with none is always allowed their
 * first, since Starter's limit is 1.
 */
export async function assertCanCreateWorkspace(userId: string): Promise<void> {
  const owned = await db
    .select({ plan: schema.workspaces.plan })
    .from(schema.workspace_members)
    .innerJoin(schema.workspaces, eq(schema.workspace_members.organizationId, schema.workspaces.id))
    .where(
      and(eq(schema.workspace_members.userId, userId), eq(schema.workspace_members.role, 'owner')),
    )

  const limit = owned.reduce<number>(
    (best, w) => Math.max(best, PLAN_LIMITS[(w.plan ?? 'starter') as Plan].workspaces),
    PLAN_LIMITS.starter.workspaces,
  )

  if (owned.length >= limit) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `Your plan includes ${limit} workspace${limit === 1 ? '' : 's'}. Upgrade to create another.`,
    )
  }
}

/**
 * Throws PLAN_LIMIT_REACHED (402) when inviting one more person would push a workspace past its
 * plan's `teamMembers` seat count. Counts existing members plus *unexpired* pending invitations
 * together — a pending invite is a claim on a seat before it's accepted, and gating only at
 * accept-time would let an admin send unlimited invites that then fail silently one by one.
 * Expired pending invites don't count: they're dead and shouldn't block a re-invite of the same
 * seat (see invitations.ts for how "expired" is derived rather than stored).
 */
export async function assertCanInviteMember(workspaceId: string): Promise<void> {
  const { plan } = await getCurrentSubscription(workspaceId)
  const limit = PLAN_LIMITS[plan].teamMembers
  if (limit === Infinity) return

  const memberCount = await db.$count(
    schema.workspace_members,
    eq(schema.workspace_members.organizationId, workspaceId),
  )
  const pendingInviteCount = await db.$count(
    schema.workspace_invitations,
    and(
      eq(schema.workspace_invitations.organizationId, workspaceId),
      eq(schema.workspace_invitations.status, 'pending'),
      gt(schema.workspace_invitations.expiresAt, new Date()),
    ),
  )

  if (memberCount + pendingInviteCount >= limit) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `Your ${plan} plan includes ${limit} team member${limit === 1 ? '' : 's'} (counting pending invites). Upgrade to invite more.`,
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
