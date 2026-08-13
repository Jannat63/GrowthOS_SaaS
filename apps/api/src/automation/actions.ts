import { and, count, desc, eq, gte, inArray } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import {
  analyzeSearchTerms,
  planActions,
  targetKey,
  type AutomationActionType,
  type AutomationCaps,
  type AutomationRule,
  type AutomationThreshold,
  type ProposedAction,
} from '@growthos/logic'
import { searchTerms } from '@growthos/logic/fixtures'
import { AppError } from '../errors.js'
import type { Page, Paged } from '../pagination.js'
import { getCampaignInsights } from '../google-ads.js'
import { getMetaCampaignInsights } from '../meta-ads.js'
import { getFatigueResults } from '../fatigue.js'
import { executeAction } from './executor.js'
import type { ActionTargetShape, StoredAction } from './types.js'
import { moduleLogger } from '../logger.js'

const log = moduleLogger('automation')

/**
 * The action queue: proposing, listing, and deciding on automation actions.
 *
 * Automation is opt-in. A workspace with no rules proposes nothing — there is deliberately no
 * default rule set, because the default behaviour of a system that can spend money must be to do
 * nothing at all.
 */

/** Statuses that still occupy their target — a second proposal against the same thing would stack. */
const OPEN_STATUSES = ['proposed', 'approved'] as const

/**
 * Action types whose input signal is a shared fixture rather than the workspace's own data, and
 * which are therefore withheld from planning.
 *
 * `refresh_creative` was here, because `getFatigueResults()` scored a global fixture and told every
 * workspace the same "Creative A" was fatigued — an identifier no real ad account has ever seen.
 * Fatigue now reads per-workspace rows from `creative_performance`, so that objection is gone and
 * the entry with it.
 *
 * `queue_content` is deliberately NOT withheld despite still reading a fixture: it is additive,
 * entirely internal, idempotent per keyword, and produces exactly what `ensurePaidToOrganic` already
 * creates by hand from the same data. It touches no external account, so the risk that motivates
 * this set — asking a live platform to act on an identifier it does not recognise — cannot arise.
 *
 * Keep the mechanism even while empty. It is the thing that stops a future adapter being wired up
 * to a signal that isn't real yet, and re-deriving that reasoning under deadline is how the unsafe
 * combination gets shipped.
 */
const FIXTURE_DERIVED_ACTIONS: ReadonlySet<AutomationActionType> = new Set()

async function loadRules(workspaceId: string): Promise<AutomationRule[]> {
  const rows = await db
    .select()
    .from(schema.automationRules)
    .where(eq(schema.automationRules.workspaceId, workspaceId))

  // Coalesce to null rather than leaving undefined: jsonb columns read back as null, and
  // `exactOptionalPropertyTypes` treats an explicit undefined as a different thing from absent.
  return rows.map((r) => ({
    actionType: r.actionType as AutomationActionType,
    enabled: r.enabled,
    mode: r.mode === 'auto' ? ('auto' as const) : ('suggest' as const),
    threshold: (r.threshold as AutomationThreshold | null) ?? null,
    caps: (r.caps as AutomationCaps | null) ?? null,
  }))
}

/** Midnight UTC today — the boundary `maxActionsPerDay` is measured against. */
function startOfDayUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

async function loadPlannerState(workspaceId: string, now: Date) {
  const [openRows, todayRows] = await Promise.all([
    db
      .select({
        actionType: schema.automationActions.actionType,
        target: schema.automationActions.target,
      })
      .from(schema.automationActions)
      .where(
        and(
          eq(schema.automationActions.workspaceId, workspaceId),
          inArray(schema.automationActions.status, [...OPEN_STATUSES]),
        ),
      ),
    db
      .select({ actionType: schema.automationActions.actionType, n: count() })
      .from(schema.automationActions)
      .where(
        and(
          eq(schema.automationActions.workspaceId, workspaceId),
          gte(schema.automationActions.createdAt, startOfDayUtc(now)),
        ),
      )
      .groupBy(schema.automationActions.actionType),
  ])

  return {
    openTargetKeys: openRows.map((r) =>
      targetKey(r.actionType as AutomationActionType, r.target as ActionTargetShape),
    ),
    proposedTodayByType: Object.fromEntries(
      todayRows.map((r) => [r.actionType, Number(r.n)]),
    ) as Partial<Record<AutomationActionType, number>>,
  }
}

/**
 * Gathers the same signals the dashboards show and runs the planner over them. Campaign insights
 * come from the live advisor path (ClickHouse, seeded until a real connection syncs); creative
 * fatigue and search terms come from the shared fixtures, exactly as `recommendations.ts` reads them,
 * so an automation proposal and the recommendation a user sees are derived from identical inputs.
 */
export async function planForWorkspace(
  workspaceId: string,
  now: Date = new Date(),
): Promise<ProposedAction[]> {
  const rules = (await loadRules(workspaceId)).filter(
    (r) => !FIXTURE_DERIVED_ACTIONS.has(r.actionType),
  )
  if (rules.filter((r) => r.enabled).length === 0) return []

  const [google, meta, state] = await Promise.all([
    getCampaignInsights(workspaceId),
    getMetaCampaignInsights(workspaceId),
    loadPlannerState(workspaceId, now),
  ])

  return planActions(
    {
      googleCampaigns: google.campaigns,
      metaCampaigns: meta.campaigns,
      creatives: await getFatigueResults(workspaceId),
      searchTerms: analyzeSearchTerms(searchTerms),
    },
    rules,
    state,
  )
}

export interface ProposeOutcome {
  proposed: number
  autoExecuted: number
  failed: number
}

/**
 * Persists proposals and immediately runs the ones their rule marked for auto-approval.
 *
 * An auto-approved action is written as `approved` before it executes, never straight to
 * `executed` — if the process dies mid-batch the ledger still shows an approved action that never
 * ran, which is recoverable and auditable. Writing the outcome first would lose that.
 */
export async function proposeActions(
  workspaceId: string,
  proposals: ProposedAction[],
): Promise<ProposeOutcome> {
  if (proposals.length === 0) return { proposed: 0, autoExecuted: 0, failed: 0 }

  const ruleRows = await db
    .select({ id: schema.automationRules.id, actionType: schema.automationRules.actionType })
    .from(schema.automationRules)
    .where(eq(schema.automationRules.workspaceId, workspaceId))
  const ruleIdByType = new Map(ruleRows.map((r) => [r.actionType, r.id]))

  const inserted = await db
    .insert(schema.automationActions)
    .values(
      proposals.map((p) => ({
        workspaceId,
        ruleId: ruleIdByType.get(p.actionType) ?? null,
        actionType: p.actionType,
        status: p.autoApprove ? 'approved' : 'proposed',
        target: p.target,
        payload: p.payload,
        previousValue: p.previousValue,
        reason: p.reason,
        ...(p.autoApprove ? { approvedBy: 'automation', approvedAt: new Date() } : {}),
      })),
    )
    .returning({ id: schema.automationActions.id, status: schema.automationActions.status })

  let autoExecuted = 0
  let failed = 0
  for (const row of inserted.filter((r) => r.status === 'approved')) {
    try {
      const done = await executeAction(workspaceId, row.id)
      if (done.status === 'executed') autoExecuted++
      else failed++
    } catch (err) {
      // A policy refusal on one auto action must not abandon the batch; the row keeps its
      // `approved` status and surfaces in the queue for a human.
      failed++
      log.error({ err }, `auto-execute failed for action ${row.id}`)
    }
  }

  return { proposed: inserted.length, autoExecuted, failed }
}

/** Plan and persist in one step — what the scheduler calls per workspace. */
export async function runAutomationForWorkspace(
  workspaceId: string,
  now: Date = new Date(),
): Promise<ProposeOutcome> {
  return proposeActions(workspaceId, await planForWorkspace(workspaceId, now))
}

export async function listActions(
  workspaceId: string,
  page: Page,
  status?: string,
): Promise<Paged<StoredAction>> {
  const where = status
    ? and(
        eq(schema.automationActions.workspaceId, workspaceId),
        eq(schema.automationActions.status, status),
      )
    : eq(schema.automationActions.workspaceId, workspaceId)

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(schema.automationActions)
      .where(where)
      .orderBy(desc(schema.automationActions.createdAt))
      .limit(page.limit)
      .offset(page.offset),
    db.select({ n: count() }).from(schema.automationActions).where(where),
  ])

  return { data: rows, total: totalRow?.n ?? 0 }
}

/**
 * Approve and run. Only a `proposed` action may be approved — the guard is what stops a rejected
 * action being resurrected, and an executed one being replayed.
 */
export async function approveAction(
  workspaceId: string,
  actionId: string,
  userId: string,
): Promise<StoredAction> {
  const claimed = await db
    .update(schema.automationActions)
    .set({ status: 'approved', approvedBy: userId, approvedAt: new Date() })
    .where(
      and(
        eq(schema.automationActions.id, actionId),
        eq(schema.automationActions.workspaceId, workspaceId),
        // Conditional on the current status, so two reviewers clicking at once produce one approval.
        eq(schema.automationActions.status, 'proposed'),
      ),
    )
    .returning({ id: schema.automationActions.id })

  if (claimed.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'This action is no longer awaiting approval — it may already have been decided.',
    )
  }

  return executeAction(workspaceId, actionId)
}

export async function rejectAction(
  workspaceId: string,
  actionId: string,
  userId: string,
): Promise<StoredAction> {
  const [updated] = await db
    .update(schema.automationActions)
    .set({ status: 'rejected', approvedBy: userId, approvedAt: new Date() })
    .where(
      and(
        eq(schema.automationActions.id, actionId),
        eq(schema.automationActions.workspaceId, workspaceId),
        eq(schema.automationActions.status, 'proposed'),
      ),
    )
    .returning()

  if (!updated) {
    throw new AppError(
      'VALIDATION_ERROR',
      'This action is no longer awaiting approval — it may already have been decided.',
    )
  }
  return updated
}
