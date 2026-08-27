import { and, count, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type {
  ContentBriefRecord,
  ContentBriefStatus,
  RecommendationStatus,
  ScoredSearchTerm,
} from '@growthos/types'
import { analyzeSearchTerms, generateContentBrief, paidToOrganicRecommendation } from '@growthos/logic'
import { searchTerms } from '@growthos/logic/fixtures'
import { publish } from './ws.js'
import type { Page, Paged } from './pagination.js'

// Scored search terms (seeded fixtures run through the canonical bridge engine).
export function getScoredSearchTerms(): ScoredSearchTerm[] {
  return analyzeSearchTerms(searchTerms).map((t) => ({
    term: t.term,
    clicks: t.clicks,
    conversions: t.conversions,
    cost: t.cost,
    organicPosition: t.organicPosition,
    conversionRate: t.conversionRate,
    recommendationType: t.recommendation.type,
    message: t.recommendation.message,
  }))
}

// Generate paid_to_organic recommendations + linked content briefs for "paid-proven, organic-needed"
// terms. Idempotent per workspace (skips if any paid_to_organic rows already exist).
export async function ensurePaidToOrganic(workspaceId: string): Promise<void> {
  const existing = await db
    .select({ id: schema.recommendations.id })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.workspaceId, workspaceId),
        eq(schema.recommendations.type, 'paid_to_organic'),
      ),
    )
  if (existing.length > 0) return

  const flagged = analyzeSearchTerms(searchTerms).filter(
    (t) => t.recommendation.type === 'paid-proven-organic-needed',
  )
  if (flagged.length === 0) return

  // Batch: one insert for all recs (RETURNING ids in VALUES order), one for all briefs.
  const recRows = await db
    .insert(schema.recommendations)
    .values(
      flagged.map((term) => {
        const m = paidToOrganicRecommendation(term, workspaceId)
        return {
          workspaceId,
          type: m.type,
          sourceChannel: m.sourceChannel,
          targetChannel: m.targetChannel,
          title: m.title,
          body: m.body,
          actionLabel: m.actionLabel,
          impactScore: m.impactScore,
          effortScore: m.effortScore,
          urgencyScore: m.urgencyScore,
          compositeScore: m.compositeScore,
          status: m.status,
          rawData: m.rawData,
        }
      }),
    )
    .returning({ id: schema.recommendations.id })

  await db.insert(schema.contentBriefs).values(
    flagged.map((term, i) => ({
      workspaceId,
      recommendationId: recRows[i]!.id,
      keyword: term.term,
      source: 'google_ads_search_term',
      sourceData: term,
      brief: generateContentBrief(term.term),
    })),
  )
  void publish({ type: 'recommendation:new', workspaceId, payload: { count: flagged.length, source: 'paid_to_organic' } })
}

export async function getContentBriefs(
  workspaceId: string,
  page: Page,
): Promise<Paged<ContentBriefRecord>> {
  const where = eq(schema.contentBriefs.workspaceId, workspaceId)
  const [rows, [totalRow]] = await Promise.all([
    db.select().from(schema.contentBriefs).where(where).limit(page.limit).offset(page.offset),
    db.select({ n: count() }).from(schema.contentBriefs).where(where),
  ])
  return {
    data: rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      recommendationId: r.recommendationId,
      keyword: r.keyword,
      status: r.status as ContentBriefStatus,
      brief: r.brief as ContentBriefRecord['brief'],
      source: r.source,
      publishedUrl: r.publishedUrl,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    })),
    total: totalRow?.n ?? 0,
  }
}

/**
 * Move a brief along the editorial pipeline, optionally recording where it shipped.
 *
 * `status` and `published_url` were written once at insert and never again — there was no endpoint
 * to change either, so "Content Pipeline" listed drafts that could not leave the draft stage. This
 * is the write side.
 *
 * Guards on workspace like every other mutation here, and clears `publishedUrl` when a brief moves
 * back out of `published`, so a URL cannot outlive the state that justified it.
 */
export async function updateContentBriefStatus(
  workspaceId: string,
  briefId: string,
  status: ContentBriefStatus,
  publishedUrl?: string | null,
): Promise<ContentBriefRecord | null> {
  const set: Partial<typeof schema.contentBriefs.$inferInsert> = { status }
  if (status === 'published') {
    if (publishedUrl !== undefined) set.publishedUrl = publishedUrl
  } else {
    set.publishedUrl = null
  }

  const [row] = await db
    .update(schema.contentBriefs)
    .set(set)
    .where(
      and(
        eq(schema.contentBriefs.id, briefId),
        eq(schema.contentBriefs.workspaceId, workspaceId),
      ),
    )
    .returning()

  if (!row) return null
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    recommendationId: row.recommendationId,
    keyword: row.keyword,
    status: row.status as ContentBriefStatus,
    brief: row.brief as ContentBriefRecord['brief'],
    source: row.source,
    publishedUrl: row.publishedUrl,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  }
}

// Act / dismiss / snooze a recommendation. Guards that the row belongs to the workspace.
export async function updateRecommendationStatus(
  workspaceId: string,
  id: string,
  status: RecommendationStatus,
  snoozedUntil?: Date,
): Promise<boolean> {
  const set: Partial<typeof schema.recommendations.$inferInsert> = { status }
  if (status === 'acted') set.actedAt = new Date()
  if (status === 'snoozed') set.snoozedUntil = snoozedUntil ?? null
  const updated = await db
    .update(schema.recommendations)
    .set(set)
    .where(and(eq(schema.recommendations.id, id), eq(schema.recommendations.workspaceId, workspaceId)))
    .returning({ id: schema.recommendations.id })
  return updated.length > 0
}
