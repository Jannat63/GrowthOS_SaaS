import { createClient, type ClickHouseClient } from '@clickhouse/client'
import { calculateBlendedMER } from '@growthos/logic'
import type { MerDashboard, MerTrendPoint } from '@growthos/types'
import { SEED_DAYS, seedDates, missingSeedDates } from './seed-window.js'
import { getDataBounds, resolveWindow, type DateWindowQuery } from './date-window.js'

let client: ClickHouseClient | null = null

export function getClickhouse(): ClickHouseClient {
  if (!client) {
    client = createClient({ url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123' })
  }
  return client
}

// Blended-revenue stand-in until real Shopify data (M3): ad-attributed value scaled up for organic.
// Exported so every surface that reports "revenue" (MER dashboard, Growth Hub) derives it the same
// way — two copies of this constant would let /analytics and the hub quietly disagree.
export const REVENUE_FACTOR = 2.2

// `only` limits which dates are generated, so a workspace missing part of the window backfills
// just the gap. `day` stays the index within the FULL window, so a row's figures never depend on
// which subset happened to be inserted.
/**
 * Total drift across the WHOLE seed window, spread evenly over it.
 *
 * The drift terms used to be `day * 0.012` (revenue) and `day * 0.008` (conversions) — per-day
 * constants calibrated when the seed was 30 days long. `day` indexes the full window, so when
 * SEED_DAYS became 180 the same constants compounded six times as far: revenue inflated 216% across
 * the window while spend has no drift at all, which pushed blended MER from 10.85x over the first
 * 30 days to 27.43x over the last 30 and would climb again on any future widening. Conversions
 * doubled over the window for the same reason.
 *
 * Expressed as a fraction of the window, the lift stays what it was meant to be whatever SEED_DAYS
 * becomes — the same shape of hazard `seed-window.ts` already documents for its 2x invariant.
 * The drift itself stays: it exists so period-over-period deltas are non-zero, and at these values
 * a 30-day window still moves ~4% on revenue and ~6% on conversions.
 */
const drift = (day: number, totalOverWindow: number) => (day / SEED_DAYS) * totalOverWindow

function seedRows(workspaceId: string, only?: Set<string>) {
  const round2 = (n: number) => Math.round(n * 100) / 100
  const rows: Record<string, unknown>[] = []
  seedDates().forEach((date, day) => {
    if (only && !only.has(date)) return
    const d = new Date(`${date}T00:00:00Z`)
    // Deterministic day-to-day variance so the MER trend reads as alive (weekend dip in
    // spend, sinusoidal swing in revenue, mild upward drift). Seeded stand-in until M3.
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
    const spendFactor = (weekend ? 0.7 : 1) * (1 + Math.sin(day / 3) * 0.12)
    const revFactor = 1 + Math.sin(day / 2.5 + 1) * 0.28 + drift(day, 0.36) + (weekend ? 0.08 : 0)
    // Conversions drift too. They used to be a flat 6/4 every single day, which meant the
    // Conversions tile reported a permanent 0% change once period-over-period deltas started
    // rendering — a headline KPI that never moves reads as a broken tile, not a stable business.
    const convOf = (b: number) => Math.max(1, Math.round(b * (1 + Math.sin(day / 3.5) * 0.18 + drift(day, 0.24))))
    rows.push({
      workspace_id: workspaceId, platform: 'google_ads', campaign_id: 'g-1',
      campaign_name: 'Search - Brand', date, impressions: 1000 + day * 10,
      clicks: 80 + day, spend: round2(45.5 * spendFactor), conversions: convOf(6),
      conversion_value: round2(320 * revFactor),
    })
    rows.push({
      workspace_id: workspaceId, platform: 'meta_ads', campaign_id: 'm-1',
      campaign_name: 'Prospecting - Lookalike', date, impressions: 5000 + day * 20,
      clicks: 120 + day, spend: round2(90.25 * spendFactor), conversions: convOf(4),
      conversion_value: round2(210 * revFactor),
    })
  })
  return rows
}

// Seed the workspace's ad_performance rows if it has none (generate-if-empty, like ensureRecommendations).
export async function ensureAdPerformanceSeed(workspaceId: string): Promise<void> {
  const missing = await missingSeedDates(getClickhouse(), 'ad_performance', workspaceId)
  if (missing.length === 0) return
  await getClickhouse().insert({
    table: 'ad_performance',
    values: seedRows(workspaceId, new Set(missing)),
    format: 'JSONEachRow',
  })
}

/**
 * Blended MER over an explicit date window.
 *
 * Was `ORDER BY date DESC LIMIT days` — "the most recent N rows", which cannot express a range that
 * ends anywhere but the newest data. The dashboard's date picker can, so the window is now a real
 * `[from, to]` filter; with no range given, `resolveWindow` still defaults to the last N days of
 * available data, which is the behaviour the LIMIT form approximated.
 */
export async function getMerTrend(
  workspaceId: string,
  query: DateWindowQuery = {},
): Promise<MerDashboard> {
  const w = resolveWindow(await getDataBounds(workspaceId), query)
  const rs = await getClickhouse().query({
    query: `
      SELECT toString(date) AS day,
        toFloat64(sumIf(spend, platform = 'google_ads')) AS googleSpend,
        toFloat64(sumIf(spend, platform = 'meta_ads')) AS metaSpend,
        toFloat64(sum(conversion_value)) AS convValue
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND date >= {from:Date} AND date <= {to:Date}
      GROUP BY day ORDER BY day`,
    query_params: { ws: workspaceId, from: w.from, to: w.to },
    format: 'JSONEachRow',
  })
  const rows = (await rs.json()) as { day: string; googleSpend: number; metaSpend: number; convValue: number }[]

  const trend: MerTrendPoint[] = rows.map((r) => {
    const revenue = Math.round(r.convValue * REVENUE_FACTOR)
    const spend = r.googleSpend + r.metaSpend
    const mer = calculateBlendedMER({ totalRevenue: revenue, googleAdsSpend: r.googleSpend, metaAdsSpend: r.metaSpend }).blendedMER
    return { date: r.day, mer, spend: Math.round(spend * 100) / 100, revenue }
  })

  const googleAdsSpend = rows.reduce((s, r) => s + r.googleSpend, 0)
  const metaAdsSpend = rows.reduce((s, r) => s + r.metaSpend, 0)
  const totalRevenue = rows.reduce((s, r) => s + r.convValue * REVENUE_FACTOR, 0)
  const summary = calculateBlendedMER({ totalRevenue, googleAdsSpend, metaAdsSpend })

  // Anomaly: last 7 days avg MER vs prior 7 days.
  const merValues = trend.map((t) => t.mer)
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const recent = avg(merValues.slice(-7))
  const prior = avg(merValues.slice(-14, -7))
  const changePercent = prior > 0 ? ((recent - prior) / prior) * 100 : 0
  // Anomaly detection is read-only here; the autonomous scheduler owns mer_alert emission (with
  // persistent dedupe) so a dashboard load never toasts. See apps/api/src/scheduler.
  const anomaly = { detected: Math.abs(changePercent) > 15, changePercent: Math.round(changePercent * 10) / 10 }

  return {
    trend,
    summary,
    channelBreakdown: {
      googleAdsSpend: Math.round(googleAdsSpend * 100) / 100,
      metaAdsSpend: Math.round(metaAdsSpend * 100) / 100,
    },
    anomaly,
  }
}
