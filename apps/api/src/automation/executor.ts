import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { requiresPreviousValue, type AutomationCaps, type AutomationActionType } from '@growthos/logic'
import { AppError } from '../errors.js'
import { dryRunAdapter } from './adapters/dry-run.js'
import { contentQueueAdapter } from './adapters/content-queue.js'
import type { ActionPlatform, ActionTargetShape, AutomationAdapter, StoredAction } from './types.js'

/**
 * Executes approved automation actions.
 *
 * All policy lives here, deliberately, so that adding a real Google Ads or Meta adapter later (P4.3b)
 * cannot accidentally bypass a safety check: an adapter is handed an action that has already been
 * proven approved, reversible, and within its rule's caps, and its only job is the side effect.
 *
 * Three gates, in order:
 *
 *  1. **Status.** Only an `approved` action may execute. This is what stops a rejected action being
 *     replayed, and stops an already-executed one running twice.
 *  2. **Reversibility.** An action that overwrites existing state must carry `previousValue`. This
 *     system changes how a customer's money is spent; something that cannot say what it is about to
 *     overwrite must not run. Additive actions are exempt (see `requiresPreviousValue`).
 *  3. **Caps, re-read from the rule now.** A rule can be edited between proposal and approval. If
 *     the approved change no longer fits the current policy the action is REFUSED, not silently
 *     clamped — executing something different from what a human approved is the exact failure this
 *     whole design exists to prevent.
 */

/**
 * Real platform adapters, by platform. Empty on purpose: no Google Ads developer token and no Meta
 * App Review exist, so there is nothing truthful to register. This is the single seam P4.3b fills —
 * adding an entry here is all that switches a workspace from dry run to live, provided it also has
 * an active connection.
 */
const REAL_ADAPTERS: Partial<Record<ActionPlatform, AutomationAdapter>> = {}

async function hasActiveConnection(workspaceId: string, platform: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.platformConnections.id })
    .from(schema.platformConnections)
    .where(
      and(
        eq(schema.platformConnections.workspaceId, workspaceId),
        eq(schema.platformConnections.platform, platform),
        eq(schema.platformConnections.isActive, true),
      ),
    )
    .limit(1)
  return Boolean(row)
}

/**
 * Both conditions must hold before anything real happens: a registered adapter AND a live
 * connection. Either missing falls back to the dry run, which is the safe direction — a workspace
 * that lost its connection records intent instead of erroring, and a half-finished integration
 * cannot leak calls to a live account.
 */
export async function resolveAdapter(
  platform: ActionPlatform,
  workspaceId: string,
): Promise<AutomationAdapter> {
  if (platform === 'content') return contentQueueAdapter

  const real = REAL_ADAPTERS[platform]
  if (!real) return dryRunAdapter
  return (await hasActiveConnection(workspaceId, platform)) ? real : dryRunAdapter
}

/**
 * Re-validates the approved change against the rule as it stands right now.
 *
 * Only `maxChangePercent` is genuinely re-checkable here, and saying so is more useful than
 * pretending otherwise:
 *  - `maxActionsPerDay` is a planning-time bound; re-applying it at execution would double-count
 *    actions already counted when they were proposed.
 *  - `minDailyBudget` needs the campaign's actual daily budget, which only a live platform
 *    integration can supply. It becomes enforceable in P4.3b, alongside the adapter that can read it.
 */
async function assertWithinCurrentCaps(action: StoredAction): Promise<void> {
  if (action.actionType !== ('adjust_budget' satisfies AutomationActionType)) return
  if (!action.ruleId) return

  const [rule] = await db
    .select({ caps: schema.automationRules.caps })
    .from(schema.automationRules)
    .where(eq(schema.automationRules.id, action.ruleId))
    .limit(1)

  const cap = (rule?.caps as AutomationCaps | null)?.maxChangePercent ?? 20
  const requested = Number((action.payload as Record<string, unknown>)?.changePercent ?? 0)

  if (requested > cap) {
    throw new AppError(
      'VALIDATION_ERROR',
      `This action was approved at ${requested}%, but the rule's cap is now ${cap}%. Re-propose it under the current policy.`,
    )
  }
}

/** Loads an action and confirms it belongs to this workspace. */
async function loadAction(workspaceId: string, actionId: string): Promise<StoredAction> {
  const [action] = await db
    .select()
    .from(schema.automationActions)
    .where(
      and(
        eq(schema.automationActions.id, actionId),
        eq(schema.automationActions.workspaceId, workspaceId),
      ),
    )
    .limit(1)

  if (!action) throw new AppError('NOT_FOUND', 'Automation action not found in this workspace.')
  return action
}

/**
 * Run one approved action. Adapter failures are recorded on the row as `failed` rather than thrown:
 * the scheduler executes batches, and one platform rejecting one call must not abandon the rest.
 * Policy violations (gates 1–3) DO throw — they mean the request itself was invalid.
 */
export async function executeAction(workspaceId: string, actionId: string): Promise<StoredAction> {
  const action = await loadAction(workspaceId, actionId)

  if (action.status !== 'approved') {
    throw new AppError(
      'VALIDATION_ERROR',
      `Only an approved action can execute — this one is '${action.status}'.`,
    )
  }

  if (
    requiresPreviousValue(action.actionType as AutomationActionType) &&
    action.previousValue == null
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'This action changes existing state but does not record what it would overwrite, so it cannot be undone. Refusing to execute.',
    )
  }

  await assertWithinCurrentCaps(action)

  const target = action.target as ActionTargetShape
  const adapter = await resolveAdapter(target.platform, workspaceId)

  let result: Awaited<ReturnType<AutomationAdapter['execute']>>
  try {
    result = await adapter.execute(action, workspaceId)
  } catch (err) {
    result = { ok: false, detail: {}, error: err instanceof Error ? err.message : String(err) }
  }

  const [updated] = await db
    .update(schema.automationActions)
    .set({
      status: result.ok ? 'executed' : 'failed',
      executedAt: new Date(),
      result: { adapter: adapter.name, ...result.detail },
      error: result.error ?? null,
    })
    .where(eq(schema.automationActions.id, actionId))
    .returning()

  return updated!
}
