import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './auth.js';

// Async job tracking (M2 · P2.1). Postgres is the source of truth for job state;
// Redis is only the pickup channel. workspaceId cascades from workspaces; access is app-layer
// enforced (no RLS) — see tenancy.ts.
export const backgroundJobs = pgTable('background_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('queued'), // queued | processing | complete | failed
  progress: integer('progress').notNull().default(0), // 0-100
  result: jsonb('result'),
  error: text('error'),
  queuedAt: timestamp('queued_at', { withTimezone: true }).defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
