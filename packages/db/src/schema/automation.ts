import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

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

/**
 * Automated campaign management (M4 · P4.3a).
 *
 * One rule per (workspace, actionType): what the workspace wants automated, how aggressively, and
 * within what limits. `mode` is the safety switch — `suggest` always requires a human approval,
 * `auto` self-approves but only while every cap in `caps` holds.
 */
export const automationRules = pgTable(
  'automation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    // 'pause_ad_set' | 'adjust_budget' | 'refresh_creative' | 'queue_content'
    actionType: text('action_type').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    mode: text('mode').notNull().default('suggest'), // 'suggest' | 'auto'
    threshold: jsonb('threshold'), // trigger parameters, e.g. { wastedSpendMin: 50 }
    // Safety rails: { maxChangePercent, maxActionsPerDay, minDailyBudget }. Enforced at execution,
    // not only at planning — a rule edited between proposal and approval must not widen the blast
    // radius of an action already in the queue.
    caps: jsonb('caps'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique('automation_rules_ws_action_uidx').on(t.workspaceId, t.actionType)],
);

/**
 * The action ledger — one row per action ever proposed, kept whatever its outcome.
 *
 * `previousValue` is an execution precondition, not bookkeeping: an action that cannot describe
 * what it is about to overwrite cannot be undone, and this system exists to change how a customer's
 * money is spent. The executor refuses to dispatch without it.
 */
export const automationActions = pgTable(
  'automation_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    ruleId: uuid('rule_id'),
    actionType: text('action_type').notNull(),
    // 'proposed' | 'approved' | 'executed' | 'failed' | 'rejected' | 'expired'
    status: text('status').notNull().default('proposed'),
    target: jsonb('target').notNull(), // { platform, campaignId?, adSetId?, keyword? }
    payload: jsonb('payload').notNull(), // the intended change, e.g. { newDailyBudget: 40 }
    previousValue: jsonb('previous_value'), // required before execution — see above
    reason: text('reason').notNull(), // deterministic justification (D4: no Claude)
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    result: jsonb('result'), // adapter response, including dry-run's record of intent
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('automation_actions_ws_status_idx').on(t.workspaceId, t.status),
    // Dedupe key: one open proposal per (workspace, actionType, target) at a time — enforced in
    // application code rather than as a constraint, since `target` is jsonb and only *open*
    // proposals should collide.
    index('automation_actions_ws_created_idx').on(t.workspaceId, t.createdAt),
  ],
);
