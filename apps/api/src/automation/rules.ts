import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { AutomationActionType, AutomationCaps, AutomationThreshold } from '@growthos/logic'

/**
 * Automation rules — what a workspace has opted into automating.
 *
 * There is no default rule set and no seeding. A workspace with no rules proposes no actions, which
 * is the only safe default for a subsystem that can pause campaigns and move budget: automation is
 * something you turn on deliberately, not something you discover is already running.
 */

export type RuleRecord = typeof schema.automationRules.$inferSelect

// `| undefined` on each optional is required, not noise: this repo compiles with
// `exactOptionalPropertyTypes`, and the caller passes a zod-parsed object whose absent fields are
// present-and-undefined rather than missing.
export interface RuleInput {
  actionType: AutomationActionType
  enabled?: boolean | undefined
  mode?: ('suggest' | 'auto') | undefined
  threshold?: AutomationThreshold | null | undefined
  caps?: AutomationCaps | null | undefined
}

export async function listRules(workspaceId: string): Promise<RuleRecord[]> {
  return db
    .select()
    .from(schema.automationRules)
    .where(eq(schema.automationRules.workspaceId, workspaceId))
    .orderBy(schema.automationRules.actionType)
}

/**
 * Create or update the workspace's rule for one action type. Keyed on (workspace, actionType) by a
 * unique constraint, so a workspace can never end up with two competing rules for the same action —
 * which would make "which cap applies?" ambiguous at exactly the wrong moment.
 */
export async function upsertRule(workspaceId: string, input: RuleInput): Promise<RuleRecord> {
  const [row] = await db
    .insert(schema.automationRules)
    .values({
      workspaceId,
      actionType: input.actionType,
      enabled: input.enabled ?? true,
      mode: input.mode ?? 'suggest',
      threshold: input.threshold ?? null,
      caps: input.caps ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.automationRules.workspaceId, schema.automationRules.actionType],
      set: {
        // Only overwrite what was actually supplied — a PATCH that flips `enabled` must not silently
        // wipe the thresholds and caps someone tuned earlier.
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.mode !== undefined ? { mode: input.mode } : {}),
        ...(input.threshold !== undefined ? { threshold: input.threshold } : {}),
        ...(input.caps !== undefined ? { caps: input.caps } : {}),
        updatedAt: new Date(),
      },
    })
    .returning()

  return row!
}

export async function deleteRule(workspaceId: string, actionType: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.automationRules)
    .where(
      and(
        eq(schema.automationRules.workspaceId, workspaceId),
        eq(schema.automationRules.actionType, actionType),
      ),
    )
    .returning({ id: schema.automationRules.id })
  return deleted.length > 0
}
