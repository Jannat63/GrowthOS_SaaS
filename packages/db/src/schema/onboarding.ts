import { jsonb, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';

// Generated onboarding artifacts (M2 · P2.2). 1:1 with a workspace (app-layer key, no FK — see tenancy.ts).
export const onboardingAnalyses = pgTable(
  'onboarding_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    crawlSummary: jsonb('crawl_summary'),
    strategy: jsonb('strategy'),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [unique('onboarding_analyses_workspace_uidx').on(t.workspaceId)],
);
