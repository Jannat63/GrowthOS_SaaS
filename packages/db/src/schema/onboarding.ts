import { jsonb, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { workspaces } from './auth.js';

// Generated onboarding artifacts (M2 · P2.2). 1:1 with a workspace, cascading on delete; access
// is app-layer enforced (no RLS — see tenancy.ts).
export const onboardingAnalyses = pgTable(
  'onboarding_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    crawlSummary: jsonb('crawl_summary'),
    strategy: jsonb('strategy'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique('onboarding_analyses_workspace_uidx').on(t.workspaceId)],
);
