import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Backend-owned recommendations (M2 · P2.3a). Produced by the canonical @growthos/logic engine and
// persisted so they can carry a status lifecycle (act/dismiss/snooze — P2.3b). workspaceId is
// app-layer enforced (no FK — see tenancy.ts). compositeScore is app-computed, not a generated column.
export const recommendations = pgTable(
  'recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    type: text('type').notNull(),
    sourceChannel: text('source_channel').notNull(),
    targetChannel: text('target_channel').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    actionLabel: text('action_label'),
    impactScore: integer('impact_score').notNull(),
    effortScore: integer('effort_score').notNull(),
    urgencyScore: integer('urgency_score').notNull(),
    compositeScore: integer('composite_score').notNull(),
    status: text('status').notNull().default('pending'), // pending | acted | dismissed | snoozed
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_recommendations_workspace').on(t.workspaceId, t.status)],
);
