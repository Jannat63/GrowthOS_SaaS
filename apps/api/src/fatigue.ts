import { and, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import type { ScoredCreative } from '@growthos/types'
import {
  detectFatigueAll,
  fatigueAlertRecommendation,
  scoreCreatives,
  type CreativePerformance,
  type ScorecardInput,
  type ScorecardResult,
} from '@growthos/logic'
import { creatives } from '@growthos/logic/fixtures'
import { getClickhouse } from './analytics.js'
import { publish } from './ws.js'

/**
 * Creative fatigue, scoped to a workspace.
 *
 * This used to score `@growthos/logic/fixtures` directly and take no workspaceId at all, so every
 * workspace was told the same "Creative A" was fatigued. Harmless while it only produced a
 * suggestion; not harmless once automation began proposing actions from it, since a refresh would
 * name a creative that exists in nobody's ad account (see docs/AUDIT-2026-08-13-codebase.md #6).
 *
 * It now reads `creative_performance` — a ClickHouse table that already existed in the schema and
 * had never been used — following the same generate-if-empty pattern as `ensureAdPerformanceSeed`.
 * The seed is derived from the same fixtures, so classifications are unchanged today; the
 * difference is that the rows belong to a workspace and are replaced wholesale the moment a real
 * Meta connection syncs.
 */

const SEED_DAYS = 14
const HALF = SEED_DAYS / 2

/**
 * Expands each fixture creative into daily rows: the recent half carries its `ctrThisWeek`, the
 * earlier half its `ctrLastWeek`. That reproduces exactly the week-over-week decline
 * `detectFatigue` looks for, rather than storing a pre-computed verdict — the engine still does the
 * judging, from data shaped like the data a real sync will write.
 */
function seedRows(workspaceId: string): Record<string, unknown>[] {
  const base = new Date('2026-06-18T00:00:00Z')
  const rows: Record<string, unknown>[] = []

  creatives.forEach((c, i) => {
    for (let day = 0; day < SEED_DAYS; day++) {
      const d = new Date(base)
      d.setUTCDate(base.getUTCDate() + day)
      const isRecent = day >= HALF
      // Ramp frequency across the window so the newest row carries the fixture's value — that is
      // the one `argMax` picks up.
      const frequency = c.frequency * (0.6 + (0.4 * day) / (SEED_DAYS - 1))
      rows.push({
        workspace_id: workspaceId,
        creative_id: `seed-${i}`,
        creative_name: c.name,
        platform: 'meta_ads',
        date: d.toISOString().slice(0, 10),
        ctr: isRecent ? c.ctrThisWeek : c.ctrLastWeek,
        cpm: 12.5,
        frequency: Math.round(frequency * 100) / 100,
        fatigue_score: 0,
      })
    }
  })
  return rows
}

export async function ensureCreativePerformanceSeed(workspaceId: string): Promise<void> {
  const rs = await getClickhouse().query({
    query: 'SELECT count() AS c FROM creative_performance WHERE workspace_id = {ws:String}',
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { c: string }[]
  if (row && Number(row.c) > 0) return
  await getClickhouse().insert({
    table: 'creative_performance',
    values: seedRows(workspaceId),
    format: 'JSONEachRow',
  })
}

/**
 * Per-creative fatigue for a workspace. Windows are measured from the latest date present in the
 * data rather than from today, for the same reason as growth-hub.ts and intelligence.ts: seeded
 * rows are anchored at a fixed base date, and a calendar window silently returns nothing for them.
 */
async function loadCreativePerformance(workspaceId: string): Promise<CreativePerformance[]> {
  await ensureCreativePerformanceSeed(workspaceId)

  const rs = await getClickhouse().query({
    query: `
      WITH (SELECT max(date) FROM creative_performance WHERE workspace_id = {ws:String}) AS maxDate
      SELECT creative_name AS name,
        toFloat64(avgIf(ctr, date > subtractDays(maxDate, 7))) AS ctrThisWeek,
        toFloat64(avgIf(ctr, date > subtractDays(maxDate, 14) AND date <= subtractDays(maxDate, 7))) AS ctrLastWeek,
        toFloat64(argMax(frequency, date)) AS frequency,
        -- Trailing-week average, matching ctrThisWeek's window. Read by the scorecard (P4.2a-2) for
        -- context only: it never affects a band, because efficiency needs spend and conversions
        -- that this table does not carry, and the seed writes a constant.
        toFloat64(avgIf(cpm, date > subtractDays(maxDate, 7))) AS cpm,
        toFloat64(dateDiff('hour', min(date), maxDate)) AS hoursSinceLaunch
      FROM creative_performance
      WHERE workspace_id = {ws:String} AND platform = 'meta_ads'
      GROUP BY creative_name
      ORDER BY creative_name`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })

  return (await rs.json()) as ScorecardInput[]
}

/**
 * Creative scorecard (M4 · P4.2a-2) — grades creatives that have actually run against this
 * workspace's own trailing CTR median.
 *
 * Lives here rather than in `meta-ads.ts` (where the plan first put it) because this module already
 * owns every `creative_performance` read: its seed, its max-date windowing, and the loader. A second
 * reader over there would have duplicated all three and drifted from them.
 *
 * Scoped to `meta_ads` by the loader's own WHERE clause — the seed writes no `google_ads` creative
 * rows, so a scorecard spanning both would return one empty half and read as "every Google creative
 * is underperforming".
 */
export async function getCreativeScorecard(workspaceId: string): Promise<ScorecardResult> {
  return scoreCreatives(await loadCreativePerformance(workspaceId))
}

export async function getFatigueResults(workspaceId: string): Promise<ScoredCreative[]> {
  const performance = await loadCreativePerformance(workspaceId)
  return detectFatigueAll(performance).map((f) => ({
    name: f.name,
    frequency: f.frequency,
    ctrThisWeek: f.ctrThisWeek,
    ctrLastWeek: f.ctrLastWeek,
    ctrDeclinePercent: f.ctrDeclinePercent,
    hoursSinceLaunch: f.hoursSinceLaunch,
    status: f.status,
    message: f.message,
  }))
}

// Generate fatigue_alert recommendations for non-healthy creatives. Idempotent per workspace.
export async function ensureFatigueAlerts(workspaceId: string): Promise<void> {
  const existing = await db
    .select({ id: schema.recommendations.id })
    .from(schema.recommendations)
    .where(
      and(
        eq(schema.recommendations.workspaceId, workspaceId),
        eq(schema.recommendations.type, 'fatigue_alert'),
      ),
    )
  if (existing.length > 0) return

  const alerts = detectFatigueAll(await loadCreativePerformance(workspaceId)).filter(
    (f) => f.status !== 'healthy',
  )
  if (alerts.length === 0) return

  await db.insert(schema.recommendations).values(
    alerts.map((f) => {
      const m = fatigueAlertRecommendation(f, workspaceId)
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
  void publish({ type: 'meta:fatigue_alert', workspaceId, payload: { count: alerts.length } })
}
