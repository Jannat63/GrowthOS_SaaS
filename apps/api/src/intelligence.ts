import { db, schema } from '@growthos/db'
import { generateWeeklyReport, type ChannelPerformance, type WeeklyReport } from '@growthos/logic'
import { getClickhouse, ensureAdPerformanceSeed } from './analytics.js'
import { ensureAllRecommendations } from './recommendations.js'

// Start of the current 7-day reporting window (YYYY-MM-DD).
function weekStart(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 6)
  return d.toISOString().slice(0, 10)
}

// Per-channel spend + ad-attributed revenue (for ROAS) from ClickHouse ad_performance, last 7 days.
async function channelPerformance(workspaceId: string): Promise<ChannelPerformance[]> {
  const rs = await getClickhouse().query({
    query: `
      SELECT platform AS channel,
        toFloat64(sum(spend)) AS spend,
        toFloat64(sum(conversion_value)) AS revenue
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND date >= {start:String}
      GROUP BY platform`,
    query_params: { ws: workspaceId, start: weekStart() },
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
