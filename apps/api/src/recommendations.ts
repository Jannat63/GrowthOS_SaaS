import { and, count, desc, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { Recommendation } from '@growthos/types'
import {
  generateCrossChannelRecommendations,
  scoreKeywords,
  analyzeSearchTerms,
  detectFatigueAll,
  analyzeCampaigns,
  toRecommendation,
} from '@growthos/logic'
import { rawKeywords, searchTerms, creatives, adCampaigns, metaCampaigns } from '@growthos/logic/fixtures'
import { ensurePaidToOrganic } from './search-terms.js'
import { ensureOrganicToPaid } from './organic-to-paid.js'
import { ensureFatigueAlerts } from './fatigue.js'
import { publish } from './ws.js'
import { getRemainingAllowance, recordUsage } from './plan-limits.js'

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

  const mapped = generateCrossChannelRecommendations({
    keywords: scoreKeywords(rawKeywords),
    searchTerms: analyzeSearchTerms(searchTerms),
    creatives: detectFatigueAll(creatives),
    googleCampaigns: analyzeCampaigns(adCampaigns),
    metaCampaigns: analyzeCampaigns(metaCampaigns),
  }).map((r) => toRecommendation(r, workspaceId))
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
  void publish({ type: 'recommendation:new', workspaceId, payload: { count: mapped.length, source: 'cross_channel' } })
  return rowsToApi(await readOrdered(workspaceId))
}

async function countRecommendations(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(schema.recommendations)
    .where(eq(schema.recommendations.workspaceId, workspaceId))
  return row?.n ?? 0
}

async function runGenerators(workspaceId: string): Promise<void> {
  await ensureRecommendations(workspaceId)
  await ensurePaidToOrganic(workspaceId)
  await ensureOrganicToPaid(workspaceId)
  await ensureFatigueAlerts(workspaceId)
}

/**
 * Unified queue (P2.7): ensure every recommendation type exists, then return all sorted by composite.
 *
 * Plan-metered at generation, never at read (M5 P5.2). Reaching the plan's weekly limit stops NEW
 * recommendations from being generated; everything already generated is still returned in full. The
 * alternative — throwing PLAN_LIMIT_REACHED from here — would 402 a Starter customer out of their
 * own dashboard, since this is the read path for the whole recommendations queue.
 *
 * Usage is measured by counting rows either side of the generators rather than by trusting them to
 * report: they're four independent one-shot helpers across three modules, and a miscount would
 * silently overcharge a customer's allowance. Unlimited plans skip the counting entirely.
 *
 * KNOWN IMPRECISION: the allowance is checked once, before the batch, so a workspace with 2 of 5
 * remaining that generates 8 lands at 8 used, not 5. Each generator is one-shot per workspace, so
 * this can overshoot at most once, and stopping mid-batch would leave the queue in a partial state
 * that reads as broken. Deliberate: the limit governs how often generation runs, not the exact row
 * count of a single batch.
 */
export async function ensureAllRecommendations(workspaceId: string): Promise<Recommendation[]> {
  const allowance = await getRemainingAllowance(workspaceId, 'recommendations_generated')

  if (allowance === Infinity) {
    await runGenerators(workspaceId)
  } else if (allowance > 0) {
    const before = await countRecommendations(workspaceId)
    await runGenerators(workspaceId)
    const created = (await countRecommendations(workspaceId)) - before
    if (created > 0) await recordUsage(workspaceId, 'recommendations_generated', created)
  }
  // allowance === 0 → generate nothing this window; existing rows are still returned below.

  return rowsToApi(await readOrdered(workspaceId))
}
