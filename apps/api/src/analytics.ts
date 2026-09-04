import { createClient, type ClickHouseClient } from '@clickhouse/client'
import { calculateBlendedMER } from '@growthos/logic'
import { REVENUE_FACTOR as SEED_REVENUE_FACTOR, seedAdRows } from '@growthos/logic/fixtures'
import type { MerDashboard, MerTrendPoint } from '@growthos/types'
import { missingSeedDates } from './seed-window.js'
import { getDataBounds, resolveWindow, type DateWindowQuery } from './date-window.js'

let client: ClickHouseClient | null = null

export function getClickhouse(): ClickHouseClient {
  if (!client) {
    client = createClient({ url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123' })
  }
  return client
}

/**
 * Blended-revenue stand-in until real Shopify data (M3): ad-attributed value scaled up for organic.
 *
 * Re-exported from the shared seed module rather than declared here, so /analytics, the Growth Hub
 * and the browser's offline fallback cannot drift apart on it.
 */
export const REVENUE_FACTOR = SEED_REVENUE_FACTOR

/**
 * The seeded rows, in ClickHouse's column names.
 *
 * The generator itself moved to `@growthos/logic/fixtures/seed` — see that module for why, and for
 * the campaign roster it now writes. This is only the adapter from its camelCase shape to the
 * table's snake_case columns.
 *
 * `only` limits which dates are inserted so a workspace missing part of the window backfills just
 * the gap; the generator still computes the whole window and filters, so a row's figures never
 * depend on which subset happened to be asked for.
 */
function seedRows(workspaceId: string, only?: Set<string>) {
  return seedAdRows(only).map((r) => ({
    workspace_id: workspaceId,
    platform: r.platform,
    campaign_id: r.campaignId,
    campaign_name: r.campaignName,
    date: r.date,
    impressions: r.impressions,
    clicks: r.clicks,
    spend: r.spend,
    conversions: r.conversions,
    conversion_value: r.conversionValue,
  }))
}

/**
 * The one-campaign-per-platform shape this seed used to write.
 *
 * `missingSeedDates` heals a widened WINDOW but not a changed SHAPE: a workspace seeded before the
 * roster split has a row for every date, so nothing reads as missing and it would keep its single
 * `g-1` / `m-1` campaign forever — the campaign pages would still show a one-row table while every
 * newly created workspace showed five. Prune by id and re-seed.
 *
 * By id, and only these two ids, on purpose. A general "delete campaigns the roster doesn't know"
 * sweep would delete a customer's real campaigns the moment a live Google/Meta sync lands. These
 * two were only ever produced by this seeder.
 */
const LEGACY_SEED_CAMPAIGN_IDS = ['g-1', 'm-1']

async function pruneLegacySeedShape(workspaceId: string): Promise<void> {
  const rs = await getClickhouse().query({
    query: `
      SELECT count() AS n FROM ad_performance
      WHERE workspace_id = {ws:String} AND campaign_id IN {ids:Array(String)}`,
    query_params: { ws: workspaceId, ids: LEGACY_SEED_CAMPAIGN_IDS },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { n: string | number }[]
  if (Number(row?.n ?? 0) === 0) return

  await getClickhouse().command({
    query: `
      ALTER TABLE ad_performance DELETE
      WHERE workspace_id = {ws:String} AND campaign_id IN {ids:Array(String)}`,
    query_params: { ws: workspaceId, ids: LEGACY_SEED_CAMPAIGN_IDS },
    // Wait for the mutation to actually apply. Without this the DELETE is queued and the
    // `missingSeedDates` call below still sees the old rows, reports nothing missing, and leaves
    // the workspace with no ad data at all — strictly worse than the stale shape it replaced.
    clickhouse_settings: { mutations_sync: '2' },
  })
}

/** Seed the workspace's ad_performance rows if it has none (generate-if-empty, like ensureRecommendations). */
export async function ensureAdPerformanceSeed(workspaceId: string): Promise<void> {
  await pruneLegacySeedShape(workspaceId)
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
        toFloat64(sum(conversion_value)) AS convValue,
        toFloat64(sumIf(conversion_value, platform = 'google_ads')) AS googleConvValue,
        toFloat64(sumIf(conversion_value, platform = 'meta_ads')) AS metaConvValue
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND date >= {from:Date} AND date <= {to:Date}
      GROUP BY day ORDER BY day`,
    query_params: { ws: workspaceId, from: w.from, to: w.to },
    format: 'JSONEachRow',
  })
  const rows = (await rs.json()) as {
    day: string
    googleSpend: number
    metaSpend: number
    convValue: number
    googleConvValue: number
    metaConvValue: number
  }[]

  const trend: MerTrendPoint[] = rows.map((r) => {
    const revenue = Math.round(r.convValue * REVENUE_FACTOR)
    const spend = r.googleSpend + r.metaSpend
    const mer = calculateBlendedMER({ totalRevenue: revenue, googleAdsSpend: r.googleSpend, metaAdsSpend: r.metaSpend }).blendedMER
    return {
      date: r.day,
      mer,
      spend: Math.round(spend * 100) / 100,
      revenue,
      googleSpend: Math.round(r.googleSpend * 100) / 100,
      metaSpend: Math.round(r.metaSpend * 100) / 100,
    }
  })

  const googleAdsSpend = rows.reduce((s, r) => s + r.googleSpend, 0)
  const metaAdsSpend = rows.reduce((s, r) => s + r.metaSpend, 0)
  const totalRevenue = rows.reduce((s, r) => s + r.convValue * REVENUE_FACTOR, 0)
  // Each platform's own claim, on the same REVENUE_FACTOR basis as the blended figure so the three
  // are comparable. These do not have to sum to totalRevenue - where they exceed it, both platforms
  // counted the same conversion, which is exactly what the page is for.
  const googleAdsRevenue = rows.reduce((s, r) => s + r.googleConvValue * REVENUE_FACTOR, 0)
  const metaAdsRevenue = rows.reduce((s, r) => s + r.metaConvValue * REVENUE_FACTOR, 0)
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
      googleAdsRevenue: Math.round(googleAdsRevenue),
      metaAdsRevenue: Math.round(metaAdsRevenue),
    },
    anomaly,
  }
}
