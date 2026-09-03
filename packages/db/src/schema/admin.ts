import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Admin audit log (Super Admin panel). Every action a platform admin takes against a customer's
 * workspace/user/subscription writes a row here — including read access to sensitive views, not
 * just changes. This is what makes "who looked at this account and why" answerable later; treated
 * as non-negotiable infrastructure given the level of access the Super Admin role has, not a
 * nice-to-have. See apps/api/src/admin-audit.ts for the write helper, apps/api/src/guards.ts for
 * where it's invoked automatically on every admin route.
 *
 * actorUserId deliberately has NO foreign key. Every workspace-scoped table cascades from
 * `workspaces` so a deleted workspace cleans up after itself — but an admin audit trail must
 * outlive the account it describes, or deleting a user would erase the record of what they did.
 */
export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: text('actor_user_id').notNull(),
    // e.g. 'workspace.view' | 'workspace.plan_override' | 'user.view' | 'audit_log.view'
    action: text('action').notNull(),
    targetType: text('target_type').notNull(), // 'workspace' | 'user' | 'subscription'
    targetId: text('target_id').notNull(),
    // Free-form context: before/after values for an override, a required reason string, etc.
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_admin_audit_actor').on(t.actorUserId, t.createdAt),
    index('idx_admin_audit_target').on(t.targetType, t.targetId),
  ],
);
