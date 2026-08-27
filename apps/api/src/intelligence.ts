import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import {
  generateWeeklyReport,
  type ChannelPerformance,
  type ReportOpportunity,
  type WeeklyReport,
} from '@growthos/logic'
import { getClickhouse, ensureAdPerformanceSeed, REVENUE_FACTOR } from './analytics.js'
import { ensureOrganicTrafficSeed } from './seo.js'
import { getDataBounds, previousWindow, resolveWindow, type DateWindow } from './date-window.js'
import { ensureAllRecommendations } from './recommendations.js'

/** The reporting period, in days. One week — this is the *weekly* report. */
const REPORT_DAYS = 7

/**
 * Start of the current 7-day reporting window (YYYY-MM-DD). Stays calendar-based on purpose: it is
 * this report's per-week idempotency key (`intelligence_reports` is unique on workspace +
 * periodStart). Keying it off the data instead would create a fresh report row every time new data
 * landed, rather than one per week.
 *
 * It is NOT the label. The window below is anchored to the newest day with data, which on any
 * workspace whose pipelines lag — every seeded one — is weeks away from the calendar week. The
 * page used to print this string as "the week of…" above figures drawn from that other window, so
 * the header stated a period the numbers underneath had not been measured over. The measured
 * window travels separately as `report.period`.
 */
function weekStart(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - (REPORT_DAYS - 1))
  return d.toISOString().slice(0, 10)
}

/**
 * Aggregate aliases are deliberately NOT the source column names (`spendTotal`, not `spend`).
 * Aliasing an aggregate to the column it sums shadows that column for the rest of the query, and
 * ClickHouse then resolves a later reference to the alias instead — which is how `AS date` over a
 * Date column produced a "no supertype for String, Date" failure elsewhere in this codebase. These
 * queries have no such reference today; the naming keeps it that way if one is ever added.
 */
interface AdRow {
  channel: string
  spendTotal: number
  revenueTotal: number
  conversionsTotal: number
}

/**
 * Per-channel ad spend, ad-attributed revenue, and conversions from ClickHouse `ad_performance`,
 * over an explicit inclusive window.
 *
 * The window comes from `resolveWindow` against the workspace's real data bounds, not from the
 * calendar. This used to filter `date >= weekStart()`, which silently emptied the entire report for
 * any workspace on seeded data: the seed is anchored at a fixed base date, so once real time moved
 * past it the calendar filter matched no rows at all. Worse, it failed quietly — an empty report
 * looks like "no ad spend this week" rather than a broken query, and the hourly scheduler persisted
 * those empty reports over good ones.
 */
async function adPerformance(workspaceId: string, w: DateWindow): Promise<AdRow[]> {
  const rs = await getClickhouse().query({
    query: `
      SELECT platform AS channel,
        toFloat64(sum(spend)) AS spendTotal,
        toFloat64(sum(conversion_value)) AS revenueTotal,
        toFloat64(sum(conversions)) AS conversionsTotal
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND date >= {from:Date} AND date <= {to:Date}
      GROUP BY platform`,
    query_params: { ws: workspaceId, from: w.from, to: w.to },
    format: 'JSONEachRow',
  })
  return (await rs.json()) as AdRow[]
}

/** Organic clicks over a window — the only volume metric Search Console gives us. */
async function organicClicks(workspaceId: string, w: DateWindow): Promise<number> {
  const rs = await getClickhouse().query({
    query: `
      SELECT toFloat64(sum(clicks)) AS clicksTotal
      FROM organic_traffic
      WHERE workspace_id = {ws:String} AND date >= {from:Date} AND date <= {to:Date}`,
    query_params: { ws: workspaceId, from: w.from, to: w.to },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { clicksTotal: number }[]
  return row?.clicksTotal ?? 0
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * The channel mix for one window: every ad platform, plus an organic row.
 *
 * Organic revenue is the blended-revenue remainder. `REVENUE_FACTOR` is the app-wide stand-in for
 * "total business revenue is roughly this multiple of ad-attributed revenue" (see analytics.ts),
 * so the part of blended revenue that is not ad-attributed is what organic and direct brought in.
 * It is modelled, not measured, and travels flagged as such so the page and the PDF can mark it.
 *
 * Reporting the ad-attributed figure alone was the previous behaviour, and it is why this page's
 * "Blended ROAS" disagreed with the Growth Hub's MER for the same week by exactly REVENUE_FACTOR —
 * the constant analytics.ts exports specifically so that cannot happen.
 */
async function channelMix(workspaceId: string, w: DateWindow): Promise<ChannelPerformance[]> {
  const [ads, clicks] = await Promise.all([adPerformance(workspaceId, w), organicClicks(workspaceId, w)])

  const channels: ChannelPerformance[] = ads.map((r) => ({
    channel: r.channel,
    spend: round2(r.spendTotal),
    revenue: round2(r.revenueTotal),
    conversions: Math.round(r.conversionsTotal),
  }))

  const adRevenue = ads.reduce((s, r) => s + r.revenueTotal, 0)
  const organicRevenue = adRevenue * (REVENUE_FACTOR - 1)
  // Skip the row entirely when there is nothing to say — a workspace with no ad revenue and no
  // organic traffic should get an empty report, not a row of zeroes labelled "estimated".
  if (organicRevenue > 0 || clicks > 0) {
    channels.push({
      channel: 'organic',
      spend: 0,
      revenue: round2(organicRevenue),
      clicks: Math.round(clicks),
      paid: false,
      modelled: true,
    })
  }
  return channels
}

/** Generate the workspace's Weekly Growth Intelligence Report and persist it (idempotent per week). */
export async function getWeeklyReport(workspaceId: string): Promise<WeeklyReport> {
  // Same generate-if-empty contract every other analytics surface uses, so a brand-new workspace
  // lands on a populated report rather than an empty one.
  await Promise.all([ensureAdPerformanceSeed(workspaceId), ensureOrganicTrafficSeed(workspaceId)])

  const bounds = await getDataBounds(workspaceId)
  const window = resolveWindow(bounds, { days: REPORT_DAYS })
  const prior = previousWindow(window)

  const [channels, previousChannels, recs] = await Promise.all([
    channelMix(workspaceId, window),
    channelMix(workspaceId, prior),
    ensureAllRecommendations(workspaceId),
  ])

  const pending = recs.filter((r) => r.status === 'pending')
  // The full recommendation travels, not just its text. Reduced to `{title, body}` the cards on the
  // report were unclickable, unranked and unattributed — three identical rows that happened to be
  // ordered by a score they never showed.
  const topOpportunities: ReportOpportunity[] = pending.slice(0, 3).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    sourceChannel: r.sourceChannel,
    targetChannel: r.targetChannel,
    priority: r.compositeScore,
  }))

  const report = generateWeeklyReport({
    weekStart: weekStart(),
    period: window,
    channels,
    // Nothing before the first day of data is a real comparison — an empty prior window would read
    // as "revenue fell 100%" rather than "there is no prior week yet".
    ...(bounds.first && prior.from >= bounds.first ? { previousChannels } : {}),
    topOpportunities,
    openOpportunities: pending.length,
  })

  await db
    .insert(schema.intelligenceReports)
    .values({ workspaceId, periodStart: report.weekStart, report })
    .onConflictDoUpdate({
      target: [schema.intelligenceReports.workspaceId, schema.intelligenceReports.periodStart],
      set: { report, createdAt: new Date() },
    })

  return report
}

// ── The archive ──────────────────────────────────────────────────────────────
//
// `intelligence_reports` has held one row per workspace per week since P3.4, and nothing ever read
// it back — the scheduler touched it only to find out when it last ran. The reports were written
// and immediately unreachable. These two functions are the read side.

export interface ReportArchiveEntry {
  weekStart: string
  generatedAt: string
}

/**
 * A stored report is only servable if it matches the shape the UI renders today.
 *
 * Rows written before the report gained blended MER, week-over-week metrics and a measured period
 * are still on disk and would deserialize into a page of `undefined`s. There is no migration to
 * run — the report is derived data that regenerates on the next read — so old rows are simply not
 * offered.
 */
function isCurrentShape(report: unknown): report is WeeklyReport {
  return (
    typeof report === 'object' &&
    report !== null &&
    'blendedMer' in report &&
    'headline' in report &&
    'channelBreakdown' in report
  )
}

/** Weeks this workspace has a readable stored report for, newest first. */
export async function listReportPeriods(workspaceId: string): Promise<ReportArchiveEntry[]> {
  const rows = await db
    .select({
      periodStart: schema.intelligenceReports.periodStart,
      createdAt: schema.intelligenceReports.createdAt,
      report: schema.intelligenceReports.report,
    })
    .from(schema.intelligenceReports)
    .where(eq(schema.intelligenceReports.workspaceId, workspaceId))
    .orderBy(desc(schema.intelligenceReports.periodStart))

  return rows
    .filter((r) => isCurrentShape(r.report))
    .map((r) => ({
      weekStart: r.periodStart,
      // `createdAt` is nullable in the schema; a row without one still has a usable period, so it
      // falls back to the week it covers rather than being dropped from the archive.
      generatedAt: (r.createdAt ?? new Date(`${r.periodStart}T00:00:00Z`)).toISOString(),
    }))
}

/** One archived week, exactly as it was generated. null when absent or written in an older shape. */
export async function getArchivedReport(
  workspaceId: string,
  weekStart: string,
): Promise<WeeklyReport | null> {
  const [row] = await db
    .select({ report: schema.intelligenceReports.report })
    .from(schema.intelligenceReports)
    .where(
      and(
        eq(schema.intelligenceReports.workspaceId, workspaceId),
        eq(schema.intelligenceReports.periodStart, weekStart),
      ),
    )
    .limit(1)

  return row && isCurrentShape(row.report) ? row.report : null
}
