import { desc, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Recommendation } from '@growthos/types'
import {
  generateCrossChannelRecommendations,
  scoreKeywords,
  analyzeSearchTerms,
  detectFatigueAll,
  toRecommendation,
} from '@growthos/logic'
import { rawKeywords, searchTerms, creatives } from '@growthos/logic/fixtures'

type Row = typeof schema.recommendations.$inferSelect

function rowsToApi(rows: Row[]): Recommendation[] {
  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    type: r.type,
    sourceChannel: r.sourceChannel,
    targetChannel: r.targetChannel,
    title: r.title,
    body: r.body,
    actionLabel: r.actionLabel,
    impactScore: r.impactScore,
    effortScore: r.effortScore,
    urgencyScore: r.urgencyScore,
    compositeScore: r.compositeScore,
    status: r.status as Recommendation['status'],
  }))
}

async function readOrdered(workspaceId: string): Promise<Row[]> {
  return db
    .select()
    .from(schema.recommendations)
    .where(eq(schema.recommendations.workspaceId, workspaceId))
    .orderBy(desc(schema.recommendations.compositeScore))
}

/**
 * Return the workspace's recommendations, generating them once from the canonical @growthos/logic
 * engine over seeded fixtures if none exist yet. Idempotent: a workspace with rows is never regenerated.
 */
export async function ensureRecommendations(workspaceId: string): Promise<Recommendation[]> {
  const existing = await readOrdered(workspaceId)
  if (existing.length > 0) return rowsToApi(existing)

  const mapped = generateCrossChannelRecommendations(
    scoreKeywords(rawKeywords),
    analyzeSearchTerms(searchTerms),
    detectFatigueAll(creatives),
  ).map((r) => toRecommendation(r, workspaceId))
  if (mapped.length === 0) return []

  await db.insert(schema.recommendations).values(
    mapped.map((m) => ({
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
    })),
  )
  return rowsToApi(await readOrdered(workspaceId))
}
