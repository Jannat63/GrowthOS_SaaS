import { db, schema } from '@growthos/db'

export type AdminTargetType = 'workspace' | 'user' | 'subscription' | 'audit_log'

/**
 * Records one Super Admin/support-agent action. Called from every admin route — including
 * read-only ones (viewing a customer's workspace is itself logged, not just changes to it). See
 * packages/db/src/schema/admin.ts for why this exists at all: given the level of access the Super
 * Admin role has, "who looked at this and why" needs to be answerable, not reconstructed after
 * the fact from server logs.
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
