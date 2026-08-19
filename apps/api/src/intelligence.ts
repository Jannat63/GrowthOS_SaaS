import { db, schema } from '@growthos/db'
import { generateWeeklyReport, type ChannelPerformance, type WeeklyReport } from '@growthos/logic'
import { getClickhouse, ensureAdPerformanceSeed } from './analytics.js'
import { ensureAllRecommendations } from './recommendations.js'

/**
 * Start of the current 7-day reporting window (YYYY-MM-DD). Stays calendar-based on purpose: it is
 * the report's label and its per-week idempotency key (`intelligence_reports` is unique on
 * workspace + periodStart). Keying it off the data instead would create a fresh report row every
 * time new data landed, rather than one per week. Only the aggregation window below is
 * data-relative.
 */
function weekStart(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 6)
  return d.toISOString().slice(0, 10)
}

/**
 * Per-channel spend + ad-attributed revenue (for ROAS) from ClickHouse ad_performance, over the
 * last 7 days *of available data*.
 *
 * The window is measured back from `max(date)` for the workspace, not from today. This used to
 * filter `date >= weekStart()` — a calendar window — which silently emptied the entire report for
 * any workspace on seeded data: `ensureAdPerformanceSeed` writes 30 days anchored at a fixed base
 * date, so once real time moved past that base the calendar filter matched no rows at all and the
 * report came back with zero channels and zero ROAS. Worse, it failed quietly: an empty report
 * looks like "no ad spend this week" rather than a broken query, and the hourly scheduler persisted
 * those empty reports over good ones.
 *
 * For a workspace on live data the two are identical (max(date) is today), so this only ever helps.
 * Same reasoning, same fix as growth-hub.ts — see the windowing note there.
 */
async function channelPerformance(workspaceId: string): Promise<ChannelPerformance[]> {
  const rs = await getClickhouse().query({
    query: `
      WITH (SELECT max(date) FROM ad_performance WHERE workspace_id = {ws:String}) AS maxDate
      SELECT platform AS channel,
        toFloat64(sum(spend)) AS spend,
        toFloat64(sum(conversion_value)) AS revenue
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND date > subtractDays(maxDate, 7)
      GROUP BY platform`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const rows = (await rs.json()) as { channel: string; spend: number; revenue: number }[]
  return rows.map((r) => ({ channel: r.channel, spend: r.spend, revenue: r.revenue }))
}

/** Generate the workspace's Weekly Growth Intelligence Report and persist it (idempotent per week). */
export async function getWeeklyReport(workspaceId: string): Promise<WeeklyReport> {
  await ensureAdPerformanceSeed(workspaceId)
  const [channels, recs] = await Promise.all([
    channelPerformance(workspaceId),
    ensureAllRecommendations(workspaceId),
  ])
  const topOpportunities = recs
    .filter((r) => r.status === 'pending')
    .slice(0, 3)
    .map((r) => ({ title: r.title, body: r.body }))

  const report = generateWeeklyReport({ weekStart: weekStart(), channels, topOpportunities })

  await db
    .insert(schema.intelligenceReports)
    .values({ workspaceId, periodStart: report.weekStart, report })
    .onConflictDoUpdate({
      target: [schema.intelligenceReports.workspaceId, schema.intelligenceReports.periodStart],
      set: { report, createdAt: new Date() },
    })

  return report
}
