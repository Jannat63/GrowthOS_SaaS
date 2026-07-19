import { createClient, type ClickHouseClient } from '@clickhouse/client'
import { calculateBlendedMER } from '@growthos/logic'
import type { MerDashboard, MerTrendPoint } from '@growthos/types'

let client: ClickHouseClient | null = null

export function getClickhouse(): ClickHouseClient {
  if (!client) {
    client = createClient({ url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123' })
  }
  return client
}

// Blended-revenue stand-in until real Shopify data (M3): ad-attributed value scaled up for organic.
const REVENUE_FACTOR = 2.2

function seedRows(workspaceId: string) {
  const base = new Date('2026-06-18T00:00:00Z')
  const round2 = (n: number) => Math.round(n * 100) / 100
  const rows: Record<string, unknown>[] = []
  for (let day = 0; day < 30; day++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + day)
    const date = d.toISOString().slice(0, 10)
    // Deterministic day-to-day variance so the MER trend reads as alive (weekend dip in
    // spend, sinusoidal swing in revenue, mild upward drift). Seeded stand-in until M3.
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
    const spendFactor = (weekend ? 0.7 : 1) * (1 + Math.sin(day / 3) * 0.12)
    const revFactor = 1 + Math.sin(day / 2.5 + 1) * 0.28 + day * 0.012 + (weekend ? 0.08 : 0)
    rows.push({
      workspace_id: workspaceId, platform: 'google_ads', campaign_id: 'g-1',
      campaign_name: 'Search - Brand', date, impressions: 1000 + day * 10,
      clicks: 80 + day, spend: round2(45.5 * spendFactor), conversions: 6,
      conversion_value: round2(320 * revFactor),
    })
    rows.push({
      workspace_id: workspaceId, platform: 'meta_ads', campaign_id: 'm-1',
      campaign_name: 'Prospecting - Lookalike', date, impressions: 5000 + day * 20,
      clicks: 120 + day, spend: round2(90.25 * spendFactor), conversions: 4,
      conversion_value: round2(210 * revFactor),
    })
  }
  return rows
}

// Seed the workspace's ad_performance rows if it has none (generate-if-empty, like ensureRecommendations).
export async function ensureAdPerformanceSeed(workspaceId: string): Promise<void> {
  const rs = await getClickhouse().query({
    query: 'SELECT count() AS c FROM ad_performance WHERE workspace_id = {ws:String}',
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { c: string }[]
  if (row && Number(row.c) > 0) return
  await getClickhouse().insert({
    table: 'ad_performance',
    values: seedRows(workspaceId),
    format: 'JSONEachRow',
  })
}

export async function getMerTrend(workspaceId: string, days: number): Promise<MerDashboard> {
  const rs = await getClickhouse().query({
    query: `
      SELECT toString(date) AS date,
        toFloat64(sumIf(spend, platform = 'google_ads')) AS googleSpend,
        toFloat64(sumIf(spend, platform = 'meta_ads')) AS metaSpend,
        toFloat64(sum(conversion_value)) AS convValue
      FROM ad_performance
      WHERE workspace_id = {ws:String}
      GROUP BY date ORDER BY date DESC LIMIT {days:UInt32}`,
    query_params: { ws: workspaceId, days },
    format: 'JSONEachRow',
  })
  const raw = (await rs.json()) as { date: string; googleSpend: number; metaSpend: number; convValue: number }[]
  const rows = raw.slice().reverse() // ascending by date

  const trend: MerTrendPoint[] = rows.map((r) => {
    const revenue = Math.round(r.convValue * REVENUE_FACTOR)
    const spend = r.googleSpend + r.metaSpend
    const mer = calculateBlendedMER({ totalRevenue: revenue, googleAdsSpend: r.googleSpend, metaAdsSpend: r.metaSpend }).blendedMER
    return { date: r.date, mer, spend: Math.round(spend * 100) / 100, revenue }
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
