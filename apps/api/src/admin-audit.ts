import { and, desc, eq, gte } from 'drizzle-orm'
import { db, schema } from '@growthos/db'

export type AdminTargetType = 'workspace' | 'user' | 'subscription' | 'audit_log'

/**
 * Actions that only read. Everything else changes state and is recorded one row per occurrence,
 * always — a repeated write is a different event even when it looks identical, and collapsing two
 * plan overrides into one row would hide the fact that someone did it twice.
 */
export const READ_ACTION_NAMES = [
  'workspace.list',
  'workspace.view',
  'workspace.usage.view',
  'workspace.activity.view',
  'workspace.admin_history.view',
  'user.list',
  'user.view',
  'health.view',
  'audit_log.view',
] as const

const READ_ACTIONS = new Set<string>(READ_ACTION_NAMES)

export function isReadAction(action: string): boolean {
  return READ_ACTIONS.has(action)
}

/**
 * How long a repeat of the same read folds into the row already there. Long enough to absorb a
 * tab refocus, a React Query refetch and someone paging back and forth; short enough that coming
 * back after lunch is recorded as a separate visit.
 */
const REPEAT_WINDOW_MS = 5 * 60 * 1000

/**
 * Records one Super Admin/support-agent action. Called from every admin route — including
 * read-only ones (viewing a customer's workspace is itself logged, not just changes to it). See
 * packages/db/src/schema/admin.ts for why this exists at all: given the level of access the Super
 * Admin role has, "who looked at this and why" needs to be answerable, not reconstructed after
 * the fact from server logs.
 *
 * **Repeated reads update the existing row rather than adding one.** The promise the console makes
 * in its header is that every view is recorded, and that stays literally true — but recorded is
 * not the same as listed separately. Every list endpoint wrote a row per fetch and no admin hook
 * set a staleTime, so one operator idly refocusing a tab produced a screen of identical
 * "Browsed people" entries minutes apart, and the record of what actually *changed* was buried
 * under the record of who looked. A repeat within REPEAT_WINDOW_MS now bumps `created_at` and
 * increments `metadata.repeats`, so the log still says the view happened, and how many times,
 * on one line.
 *
 * The counter lives in the existing `metadata` jsonb rather than a new column, which is what
 * keeps this migration-free.
 *
 * Deliberately does not throw on failure — an audit-log write failing should never be the reason
 * an admin can't do their job, but it does get logged to stderr so a broken audit pipeline doesn't
 * fail silently forever.
 */
export async function logAdminAction(
  actorUserId: string,
  action: string,
  targetType: AdminTargetType,
  targetId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    if (isReadAction(action)) {
      const since = new Date(Date.now() - REPEAT_WINDOW_MS)
      const [recent] = await db
        .select({ id: schema.adminAuditLog.id, metadata: schema.adminAuditLog.metadata })
        .from(schema.adminAuditLog)
        .where(
          and(
            eq(schema.adminAuditLog.actorUserId, actorUserId),
            eq(schema.adminAuditLog.action, action),
            eq(schema.adminAuditLog.targetType, targetType),
            eq(schema.adminAuditLog.targetId, targetId),
            gte(schema.adminAuditLog.createdAt, since),
          ),
        )
        .orderBy(desc(schema.adminAuditLog.createdAt))
        .limit(1)

      if (recent) {
        // The newest metadata wins (a list read carries its search term, and the term someone is
        // on now is the useful one), but `repeats` accumulates across the window.
        const previous = (recent.metadata ?? {}) as Record<string, unknown>
        const repeats = typeof previous.repeats === 'number' ? previous.repeats : 1
        await db
          .update(schema.adminAuditLog)
          .set({
            createdAt: new Date(),
            metadata: { ...previous, ...(metadata ?? {}), repeats: repeats + 1 },
          })
          .where(eq(schema.adminAuditLog.id, recent.id))
        return
      }
    }

    await db.insert(schema.adminAuditLog).values({
      actorUserId,
      action,
      targetType,
      targetId,
      metadata: metadata ?? null,
    })
  } catch (err) {
    console.error('[admin-audit] failed to write audit log entry', { actorUserId, action, targetType, targetId, err })
  }
}
