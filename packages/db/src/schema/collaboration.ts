import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Team collaboration on recommendations (M3 · P3.5). A comment thread per recommendation.
 *
 * "Task assignment" is deliberately NOT a separate table: a recommendation already carries a status
 * lifecycle (pending | acted | dismissed | snoozed), so an assignee + due date live directly on the
 * `recommendations` row (see `assignedTo` / `dueDate` there) rather than in a redundant parallel
 * status machine. This table holds only the discussion thread.
 *
 * workspaceId / recommendationId / authorId are app-layer enforced (no FK — see tenancy.ts).
 */
export const recommendationComments = pgTable(
  'recommendation_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id').notNull(),
    recommendationId: uuid('recommendation_id').notNull(),
    authorId: text('author_id').notNull(), // → user.id
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_rec_comments_rec').on(t.recommendationId, t.createdAt)],
);
