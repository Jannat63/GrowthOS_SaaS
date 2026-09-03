import { jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './auth.js';

// Weekly Growth Intelligence Report (M3 · P3.4). One row per workspace + week (idempotent regen).
export const intelligenceReports = pgTable(
  'intelligence_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    periodStart: text('period_start').notNull(), // YYYY-MM-DD (week start)
    report: jsonb('report').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique('intelligence_reports_workspace_period_uidx').on(t.workspaceId, t.periodStart)],
);
