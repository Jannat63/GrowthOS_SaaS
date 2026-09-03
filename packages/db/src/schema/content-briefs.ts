import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './auth.js';

// Content briefs (M2 · P2.3b) — the actionable output attached to a paid->organic recommendation.
// workspaceId cascades from workspaces; access is app-layer enforced (no RLS — see tenancy.ts).
export const contentBriefs = pgTable('content_briefs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  recommendationId: uuid('recommendation_id'),
  keyword: text('keyword').notNull(),
  source: text('source').notNull(), // google_ads_search_term | organic_top_page | meta_hook | manual
  sourceData: jsonb('source_data'),
  brief: jsonb('brief').notNull(),
  status: text('status').notNull().default('draft'), // draft | approved | in_progress | published
  publishedUrl: text('published_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
