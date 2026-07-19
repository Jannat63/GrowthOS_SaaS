import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Per-workspace audit log (M3 · P3.5, agency slice B). An append-only record of who did what.
 *
 * Written best-effort from mutating routes (never blocks the request). `actorId` is null for
 * system / OAuth-callback actions with no authenticated user. workspaceId / actorId / entityId are
 * app-layer enforced (no FK — see tenancy.ts).
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    actorId: text('actor_id'), // → user.id; null = system/oauth
    action: text('action').notNull(), // e.g. 'recommendation.status_changed'
    entityType: text('entity_type').notNull(), // e.g. 'recommendation' | 'connection'
    entityId: text('entity_id'),
    metadata: jsonb('metadata'), // action-specific detail (before/after, status, …)
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_audit_workspace_created').on(t.workspaceId, t.createdAt)],
);
