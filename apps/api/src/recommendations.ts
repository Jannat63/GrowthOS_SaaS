import { and, desc, eq } from 'drizzle-orm'
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
import { ensurePaidToOrganic } from './search-terms.js'
import { ensureOrganicToPaid } from './organic-to-paid.js'
import { ensureFatigueAlerts } from './fatigue.js'

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
    assignedTo: r.assignedTo,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
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
  // Guard on the cross_channel type specifically, so this composes with the other
  // per-type generators (paid_to_organic, organic_to_paid, fatigue_alert) without conflict.
  const existing = await db
    .select({ id: schema.recommendations.id })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.workspaceId, workspaceId),
        eq(schema.recommendations.type, 'cross_channel'),
      ),
    )
  if (existing.length > 0) return rowsToApi(await readOrdered(workspaceId))

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

// Unified queue (P2.7): ensure every recommendation type exists, then return all sorted by composite.
export async function ensureAllRecommendations(workspaceId: string): Promise<Recommendation[]> {
  await ensureRecommendations(workspaceId)
  await ensurePaidToOrganic(workspaceId)
  await ensureOrganicToPaid(workspaceId)
  await ensureFatigueAlerts(workspaceId)
  return rowsToApi(await readOrdered(workspaceId))
}
