import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { TopOrganicPage } from '@growthos/types'
import { scoreKeywords, generateCreativeBrief, organicToPaidRecommendation } from '@growthos/logic'
import { rawKeywords } from '@growthos/logic/fixtures'
import { publish } from './ws.js'

// Top organic pages worth amplifying with paid: ranking (≤10) with meaningful demand (≥5000/mo).
function topKeywords() {
  return scoreKeywords(rawKeywords).filter(
    (k) => k.currentPosition !== null && k.currentPosition <= 10 && k.volume >= 5000,
  )
}

export function getTopOrganicPages(): TopOrganicPage[] {
  return topKeywords().map((k) => ({
    keyword: k.keyword,
    volume: k.volume,
    currentPosition: k.currentPosition,
    opportunityScore: k.opportunityScore,
  }))
}

// Generate organic_to_paid recommendations + linked Meta creative briefs. Idempotent per workspace.
export async function ensureOrganicToPaid(workspaceId: string): Promise<void> {
  const existing = await db
    .select({ id: schema.recommendations.id })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.workspaceId, workspaceId),
        eq(schema.recommendations.type, 'organic_to_paid'),
      ),
    )
  if (existing.length > 0) return

  const top = topKeywords()
  if (top.length === 0) return

  // Batch: one insert for all recs (RETURNING ids in VALUES order), one for all creative briefs.
  const recRows = await db
    .insert(schema.recommendations)
    .values(
      top.map((k) => {
        const m = organicToPaidRecommendation(k, workspaceId)
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
    top.map((k, i) => ({
      workspaceId,
      recommendationId: recRows[i]!.id,
      keyword: k.keyword,
      source: 'organic_top_page',
      sourceData: k,
      brief: generateCreativeBrief(k),
    })),
  )
  void publish({ type: 'recommendation:new', workspaceId, payload: { count: top.length, source: 'organic_to_paid' } })
}
