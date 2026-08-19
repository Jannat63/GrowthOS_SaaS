import { and, asc, count, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { RecommendationComment } from '@growthos/types'
import type { Page, Paged } from './pagination.js'

// Confirm a recommendation belongs to the workspace before any collaboration write/read —
// workspace isolation is enforced at the app layer (no FK; see tenancy.ts).
async function recInWorkspace(workspaceId: string, recId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.recommendations.id })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.id, recId),
        eq(schema.recommendations.workspaceId, workspaceId),
      ),
    )
  return Boolean(row)
}

/** Comment thread for a recommendation, oldest-first, with each author's display name. */
export async function listComments(
  workspaceId: string,
  recId: string,
  page: Page,
): Promise<Paged<RecommendationComment> | null> {
  if (!(await recInWorkspace(workspaceId, recId))) return null
  const where = eq(schema.recommendationComments.recommendationId, recId)
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: schema.recommendationComments.id,
        recommendationId: schema.recommendationComments.recommendationId,
        authorId: schema.recommendationComments.authorId,
        authorName: schema.user.name,
        body: schema.recommendationComments.body,
        createdAt: schema.recommendationComments.createdAt,
      })
      .from(schema.recommendationComments)
      // LEFT join: keep the comment even if the author's user row was removed.
      .leftJoin(schema.user, eq(schema.recommendationComments.authorId, schema.user.id))
      .where(where)
      .orderBy(asc(schema.recommendationComments.createdAt))
      .limit(page.limit)
      .offset(page.offset),
    db.select({ n: count() }).from(schema.recommendationComments).where(where),
  ])
  return {
    data: rows.map((r) => ({
      id: r.id,
      recommendationId: r.recommendationId,
      authorId: r.authorId,
      authorName: r.authorName ?? null,
      body: r.body,
      createdAt: (r.createdAt ?? new Date()).toISOString(),
    })),
    total: totalRow?.n ?? 0,
  }
}

/** Add a comment to a recommendation's thread. Returns null if the rec isn't in the workspace. */
export async function addComment(
  workspaceId: string,
  recId: string,
  authorId: string,
  body: string,
): Promise<RecommendationComment | null> {
  if (!(await recInWorkspace(workspaceId, recId))) return null
  const [row] = await db
    .insert(schema.recommendationComments)
    .values({ workspaceId, recommendationId: recId, authorId, body })
    .returning()
  const [author] = await db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, authorId))
  return {
    id: row!.id,
    recommendationId: row!.recommendationId,
    authorId: row!.authorId,
    authorName: author?.name ?? null,
    body: row!.body,
    createdAt: (row!.createdAt ?? new Date()).toISOString(),
  }
}

/** Assign (or unassign, with `assignedTo: null`) a recommendation + optional due date. */
export async function assignRecommendation(
  workspaceId: string,
  recId: string,
  assignedTo: string | null,
  dueDate: Date | null,
): Promise<boolean> {
  const res = await db
    .update(schema.recommendations)
    .set({ assignedTo, dueDate })
    .where(
      and(
        eq(schema.recommendations.id, recId),
        eq(schema.recommendations.workspaceId, workspaceId),
      ),
    )
    .returning({ id: schema.recommendations.id })
  return res.length > 0
}
