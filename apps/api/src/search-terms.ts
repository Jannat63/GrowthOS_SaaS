import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { ContentBriefRecord, RecommendationStatus, ScoredSearchTerm } from '@growthos/types'
import { analyzeSearchTerms, generateContentBrief, paidToOrganicRecommendation } from '@growthos/logic'
import { searchTerms } from '@growthos/logic/fixtures'

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
}

export async function getContentBriefs(workspaceId: string): Promise<ContentBriefRecord[]> {
  const rows = await db
    .select()
    .from(schema.contentBriefs)
    .where(eq(schema.contentBriefs.workspaceId, workspaceId))
  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    recommendationId: r.recommendationId,
    keyword: r.keyword,
    status: r.status,
    brief: r.brief as ContentBriefRecord['brief'],
  }))
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
