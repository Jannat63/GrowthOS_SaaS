import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

/**
 * Autonomous automation loop schema (scheduled intelligence & alerting).
 *
 * `workspaceId` has no DB-level FK (same rationale as `./tenancy.ts` — app-layer isolation).
 */

// Persistent alert de-duplication. One row per (workspace, alertType); an alert re-fires only when
// its `signature` changes — so a new MER anomaly or a newly-fatigued creative emits, but a standing
// condition does not re-toast on every tick. Replaces the old per-process in-memory dedupe.
export const automationAlerts = pgTable(
  'automation_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    alertType: text('alert_type').notNull(), // 'mer_anomaly' | 'fatigue'
    signature: text('signature').notNull(), // opaque fingerprint of the current alertable state
    emittedAt: timestamp('emitted_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique('automation_alerts_ws_type_uidx').on(t.workspaceId, t.alertType)],
);

// One row per scheduler tick — observability for the autonomous loop.
export const schedulerRuns = pgTable('scheduler_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  refreshedCount: integer('refreshed_count').notNull().default(0),
  alertCount: integer('alert_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  details: jsonb('details'), // { errors: [{ workspaceId, message }], refreshed: [workspaceId] }
});
