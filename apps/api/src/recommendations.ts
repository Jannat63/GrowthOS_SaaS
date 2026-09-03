import { and, asc, count, desc, eq, exists, inArray, isNotNull, isNull, lte, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
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
import type { Page, Paged } from './pagination.js'

type Row = typeof schema.recommendations.$inferSelect

const iso = (d: Date | null) => (d ? d.toISOString() : null)

/**
 * Comment counts for a page of recommendations, in one grouped query.
 *
 * The count has to travel with the list. Fetched per card it is invisible until the card is
 * opened, which is the state the queue was in: you could not tell which of thirty rows had a
 * discussion on it without clicking all thirty. Scoped to the ids actually being returned so this
 * stays one small query rather than a scan of the workspace's whole comment history.
 */
async function commentCounts(recIds: string[]): Promise<Map<string, number>> {
  if (recIds.length === 0) return new Map()
  const rows = await db
    .select({
      recommendationId: schema.recommendationComments.recommendationId,
      n: count(),
    })
    .from(schema.recommendationComments)
    .where(inArray(schema.recommendationComments.recommendationId, recIds))
    .groupBy(schema.recommendationComments.recommendationId)
  return new Map(rows.map((r) => [r.recommendationId, r.n]))
}

async function rowsToApi(rows: Row[]): Promise<Recommendation[]> {
  const counts = await commentCounts(rows.map((r) => r.id))
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
    dueDate: iso(r.dueDate),
    snoozedUntil: iso(r.snoozedUntil),
    actedAt: iso(r.actedAt),
    createdAt: iso(r.createdAt),
    commentCount: counts.get(r.id) ?? 0,
  }))
}

/**
 * The queue's order.
 *
 * `compositeScore` alone is not a total order over this data — it is a near-tie. Every
 * `cross_channel` recommendation is scored with a constant effort (40) and an urgency derived
 * solely from impact, so its composite collapses to one of three values; on the seeded fixtures 22
 * of 28 rows share a score with at least one other row, 13 of them on the same value. Ordering by
 * that column alone therefore left the bulk of the queue to be arranged by whatever order Postgres
 * happened to return, which could differ between two loads of the same page.
 *
 * Effort ascending is the tiebreaker because it is the one that answers the question an operator
 * actually has at equal priority — what can I clear now — and `id` last makes the result stable
 * rather than merely usually-stable.
 */
async function readOrdered(workspaceId: string, page?: Page): Promise<Row[]> {
  const q = db
    .select()
    .from(schema.recommendations)
    .where(eq(schema.recommendations.workspaceId, workspaceId))
    .orderBy(
      desc(schema.recommendations.compositeScore),
      asc(schema.recommendations.effortScore),
      asc(schema.recommendations.id),
    )
  return page ? q.limit(page.limit).offset(page.offset) : q
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

/**
 * Runs the four one-shot generators concurrently.
 *
 * Each guards on its own recommendation `type` (`cross_channel`, `paid_to_organic`,
 * `organic_to_paid`, `fatigue_alert`) and batches its own inserts, so none can observe or clobber
 * another's rows — they were written to compose. Sequencing them therefore bought nothing and cost
 * the sum of four independent round-trip chains against Neon instead of the slowest one. On the
 * dashboard's first load for a new workspace that was the difference between a visible wait and a
 * quick one; it was also enough to push the full-generation test past a 30s timeout.
 *
 * If a future generator ever depends on another's output, it must not simply be added to this list.
 */
async function runGenerators(workspaceId: string): Promise<void> {
  await Promise.all([
    ensureRecommendations(workspaceId),
    ensurePaidToOrganic(workspaceId),
    ensureOrganicToPaid(workspaceId),
    ensureFatigueAlerts(workspaceId),
  ])
}

/**
 * Unified queue (P2.7): make sure every recommendation type exists for this workspace.
 *
 * Plan-metered at generation, never at read (M5 P5.2). Reaching the plan's weekly limit stops NEW
 * recommendations from being generated; everything already generated is still returned in full. The
 * alternative — throwing PLAN_LIMIT_REACHED from here — would 402 a Starter customer out of their
 * own dashboard, since this is the read path for the whole recommendations queue.
 *
 * Usage is measured by counting rows either side of the generators rather than by trusting them to
 * report: they're four independent one-shot helpers across three modules, and a miscount would
 * silently overcharge a customer's allowance.
 *
 * KNOWN IMPRECISION: the allowance is checked once, before the batch, so a workspace with 2 of 5
 * remaining that generates 8 lands at 8 used, not 5. Stopping mid-batch would leave the queue in a
 * partial state that reads as broken. Deliberate: the limit governs how often generation runs, not
 * the exact row count of a single batch.
 */
/**
 * Drop `cross_channel` rows that duplicate a specialised generator's recommendation.
 *
 * The four generators compose by type, which is what let this through: the cross-channel engine's
 * GoogleAds->SEO rule and `ensurePaidToOrganic` both read `analyzeSearchTerms()` over the same
 * source and both emit the identical sentence, `Create SEO content for "<term>"`. The queue then
 * listed the same job twice at two different priorities — on the seeded fixtures, three duplicate
 * pairs scored 90/100, 90/78 and 90/48. For a screen whose entire purpose is "what should I do
 * next", listing one job twice at two answers is the worst thing it can do.
 *
 * The specialised row wins, on two counts: it scores impact from real data (conversion volume)
 * where the cross-channel engine assigns a flat High/Medium/Low bucket, and it carries a linked
 * content brief that the cross-channel row has no equivalent of. Deleting the richer row and
 * keeping the coarser one would lose the brief.
 *
 * Only `pending`, unassigned rows are removed — once someone has acted on, snoozed, or been
 * assigned a row, it is their work item and deleting it out from under them would be a worse bug
 * than the duplicate. Those survivors are rare (a duplicate has to be touched before its first
 * dedupe pass) and are visibly resolved by acting on either copy.
 *
 * This runs on read rather than only at generation because the duplicates are already persisted in
 * every workspace created before this fix — a generation-time-only guard would leave them there
 * forever. It is a single DELETE against an indexed workspace column and is a no-op once clean.
 */
async function dedupeAgainstSpecialisedRows(workspaceId: string): Promise<void> {
  const other = alias(schema.recommendations, 'other')
  await db.delete(schema.recommendations).where(
    and(
      eq(schema.recommendations.workspaceId, workspaceId),
      eq(schema.recommendations.type, 'cross_channel'),
      eq(schema.recommendations.status, 'pending'),
      isNull(schema.recommendations.assignedTo),
      exists(
        db
          .select({ one: sql`1` })
          .from(other)
          .where(
            and(
              eq(other.workspaceId, workspaceId),
              eq(other.title, schema.recommendations.title),
              ne(other.type, 'cross_channel'),
            ),
          ),
      ),
    ),
  )
}

/**
 * Return snoozed recommendations to the queue once their date has passed.
 *
 * Snooze wrote `snoozed_until` and nothing ever read it, so a deferred item stayed deferred
 * permanently — the half of "remind me later" that makes it different from dismissing.
 * Rows snoozed with no end date are left alone: that is an explicit "not now, no deadline".
 */
async function wakeExpiredSnoozes(workspaceId: string): Promise<void> {
  await db
    .update(schema.recommendations)
    .set({ status: 'pending', snoozedUntil: null })
    .where(
      and(
        eq(schema.recommendations.workspaceId, workspaceId),
        eq(schema.recommendations.status, 'snoozed'),
        isNotNull(schema.recommendations.snoozedUntil),
        lte(schema.recommendations.snoozedUntil, new Date()),
      ),
    )
}

async function ensureGenerated(workspaceId: string): Promise<void> {
  const before = await countRecommendations(workspaceId)

  // The first batch is onboarding, not weekly accrual, and is deliberately NOT metered.
  //
  // The four generators emit roughly twenty rows in one shot — four times a Starter plan's entire
  // weekly allowance of five. Metering that batch leaves every Starter workspace pinned at its cap
  // from its very first dashboard load, unable to accrue anything new for the rest of the week and
  // re-capped the instant the next window opens. That is "5 recommendations, ever", which is not
  // what the pricing page sells. Charging for the initial population is the wrong reading of a
  // per-week limit.
  //
  // So the cap governs INCREMENTAL generation: once a workspace has recommendations, any further
  // generation is metered and gated. No repeatable generator exists yet (all four are one-shot per
  // workspace), so today this branch is reached only after a reset — but it is the correct
  // semantics for when the scheduled loop or M4 P4.2 starts producing new recommendations on a
  // cadence, and it is the branch the limit was written for.
  if (before === 0) {
    await runGenerators(workspaceId)
    await dedupeAgainstSpecialisedRows(workspaceId)
    return
  }

  // Maintenance runs whether or not generation is allowed this window: a capped workspace still
  // needs its expired snoozes woken and its pre-existing duplicates cleared. Returning early here
  // is what would leave a Starter plan permanently looking at a duplicated queue.
  await Promise.all([wakeExpiredSnoozes(workspaceId), dedupeAgainstSpecialisedRows(workspaceId)])

  const allowance = await getRemainingAllowance(workspaceId, 'recommendations_generated')
  if (allowance <= 0) return // capped this window; existing rows are still returned to callers

  await runGenerators(workspaceId)
  await dedupeAgainstSpecialisedRows(workspaceId)
  const created = (await countRecommendations(workspaceId)) - before
  if (created > 0) await recordUsage(workspaceId, 'recommendations_generated', created)
}

/**
 * The whole queue, unpaginated — kept for the public API, whose consumers pull the full set into
 * their own tooling and have no way to page.
 */
export async function ensureAllRecommendations(workspaceId: string): Promise<Recommendation[]> {
  await ensureGenerated(workspaceId)
  return rowsToApi(await readOrdered(workspaceId))
}

/** Paginated read of the same queue — what the internal list route serves. */
export async function listRecommendations(
  workspaceId: string,
  page: Page,
): Promise<Paged<Recommendation>> {
  await ensureGenerated(workspaceId)
  const [rows, total] = await Promise.all([
    readOrdered(workspaceId, page),
    countRecommendations(workspaceId),
  ])
  return { data: await rowsToApi(rows), total }
}
