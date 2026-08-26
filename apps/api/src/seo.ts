import { getClickhouse } from './analytics.js'
import { clusterKeywords } from '@growthos/logic'
import type {
  KeywordRanking,
  OrganicPage,
  OrganicTrafficPoint,
  OrganicTrafficResponse,
  SeoClustersResponse,
  SeoRankingsResponse,
} from '@growthos/types'

// SEO rank tracking (M3 P3.1, GSC-fed slice). Reads keyword positions from ClickHouse
// `keyword_rankings` — the table P3.0's Google Search Console sync populates. Until a real GSC
// connection syncs, a deterministic 30-day series is seeded so the tracker reads alive (same
// generate-if-empty pattern as ensureAdPerformanceSeed).
//
// KNOWN LIMITATION (shared by every seed here): the check-count-then-insert is not atomic and the
// ClickHouse tables are MergeTree (no dedup), so two concurrent first-loads of a brand-new workspace
// could both seed and double the rows. Narrow window on demo data only — real GSC sync deletes-by-date
// before insert. Revisit with a Postgres advisory lock keyed on workspace if this ever bites.

const SEED_KEYWORDS = [
  'best office chair for back pain',
  'ergonomic desk setup',
  'standing desk converter',
  'office chair lumbar support',
  'home office ideas',
  'monitor arm mount',
  'mechanical keyboard for work',
  'desk cable management',
]

function seedRows(workspaceId: string): Record<string, unknown>[] {
  const base = new Date('2026-06-18T00:00:00Z')
  const rows: Record<string, unknown>[] = []
  SEED_KEYWORDS.forEach((keyword, i) => {
    for (let day = 0; day < 30; day++) {
      const d = new Date(base)
      d.setUTCDate(base.getUTCDate() + day)
      // Start mid-page, drift upward (improving) with a mild sinusoidal wobble. Clamp to >= 1.
      const drift = day * 0.12
      const wobble = Math.sin(day / 4 + i) * 1.5
      const position = Math.max(1, Math.round(6 + i * 2.5 - drift + wobble))
      rows.push({
        workspace_id: workspaceId,
        keyword_id: keyword,
        keyword,
        date: d.toISOString().slice(0, 10),
        position,
        device: 'desktop',
        location: '',
        has_ai_overview: 0,
        cited_in_ai_overview: 0,
      })
    }
  })
  return rows
}

export async function ensureKeywordRankingsSeed(workspaceId: string): Promise<void> {
  const rs = await getClickhouse().query({
    query: 'SELECT count() AS c FROM keyword_rankings WHERE workspace_id = {ws:String}',
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { c: string }[]
  if (row && Number(row.c) > 0) return
  await getClickhouse().insert({
    table: 'keyword_rankings',
    values: seedRows(workspaceId),
    format: 'JSONEachRow',
  })
}

/** Per-keyword rank tracking: latest position, 7-day change, best, and a 30-day series. */
export async function getKeywordRankings(workspaceId: string): Promise<SeoRankingsResponse> {
  await ensureKeywordRankingsSeed(workspaceId)
  const rs = await getClickhouse().query({
    query: `
      SELECT keyword, toString(date) AS date, toUInt16(position) AS position
      FROM keyword_rankings
      WHERE workspace_id = {ws:String}
      ORDER BY keyword, date`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const rows = (await rs.json()) as { keyword: string; date: string; position: number }[]

  const byKeyword = new Map<string, { date: string; position: number }[]>()
  for (const r of rows) {
    const arr = byKeyword.get(r.keyword) ?? []
    arr.push({ date: r.date, position: Number(r.position) })
    byKeyword.set(r.keyword, arr)
  }

  const keywords: KeywordRanking[] = [...byKeyword.entries()].map(([keyword, series]) => {
    const latest = series[series.length - 1]!.position
    // ~7 days back (or the earliest point if the series is short).
    const prev = series[Math.max(0, series.length - 8)]!.position
    const best = series.reduce((m, p) => Math.min(m, p.position), Infinity)
    return {
      keyword,
      position: latest,
      previousPosition: prev,
      change: prev - latest, // positive = moved up (improved)
      best,
      series,
    }
  })
  // Best current position first.
  keywords.sort((a, b) => a.position - b.position)

  const tracked = keywords.length
  const avgPosition = tracked
    ? Math.round((keywords.reduce((s, k) => s + k.position, 0) / tracked) * 10) / 10
    : 0
  const topThree = keywords.filter((k) => k.position <= 3).length
  const improved = keywords.filter((k) => k.change > 0).length

  return { keywords, summary: { tracked, avgPosition, topThree, improved } }
}

/**
 * Topical clusters over the workspace's tracked keywords (M3 P3.1 slice).
 *
 * Adapts the pure `clusterKeywords` engine over the same `keyword_rankings` data the rank tracker
 * reads, the same way `google-ads-advisor` is adapted over `ad_performance` — the engine takes
 * `string[]` and knows nothing about ClickHouse, so `apps/web` runs the identical engine over its
 * fixtures and gets identical groupings.
 *
 * Positions come from `getKeywordRankings` rather than a second query: it already seeds an empty
 * workspace, and re-querying would risk the two surfaces disagreeing about the keyword set.
 *
 * Every cluster comes back `intentVerified: false` — see `SeoKeywordCluster` for why that matters
 * and must reach the UI.
 */
export async function getKeywordClusters(workspaceId: string): Promise<SeoClustersResponse> {
  const { keywords } = await getKeywordRankings(workspaceId)
  const positionByKeyword = new Map(keywords.map((k) => [k.keyword, k.position]))

  const clusters = clusterKeywords(keywords.map((k) => k.keyword)).map((cluster) => {
    const members = cluster.keywords.map((keyword) => ({
      keyword,
      position: positionByKeyword.get(keyword) ?? 0,
    }))
    // Best-ranking keyword first, so the cluster leads with the page already closest to winning.
    members.sort((a, b) => a.position - b.position)
    const avgPosition = members.length
      ? Math.round((members.reduce((s, m) => s + m.position, 0) / members.length) * 10) / 10
      : 0
    return { clusterName: cluster.clusterName, intentVerified: cluster.intentVerified, keywords: members, avgPosition }
  })

  // Biggest clusters first — a cluster of one is a keyword with no topical neighbours, which is the
  // least actionable thing on the page.
  clusters.sort((a, b) => b.keywords.length - a.keywords.length || a.avgPosition - b.avgPosition)

  return {
    clusters,
    summary: {
      clusters: clusters.length,
      keywords: keywords.length,
      largestCluster: clusters.reduce((m, c) => Math.max(m, c.keywords.length), 0),
      singletons: clusters.filter((c) => c.keywords.length === 1).length,
    },
  }
}

// ── Organic traffic (GSC page dimension → organic_traffic) ───────────────────────────────────

const SEED_PAGES = [
  '/blog/best-office-chair-for-back-pain',
  '/products/ergonomic-desk',
  '/blog/home-office-setup-guide',
  '/products/standing-desk-converter',
  '/blog/lumbar-support-explained',
  '/products/monitor-arm',
  '/blog/cable-management-tips',
  '/collections/keyboards',
]

function seedOrganicRows(workspaceId: string): Record<string, unknown>[] {
  const base = new Date('2026-06-18T00:00:00Z')
  const rows: Record<string, unknown>[] = []
  SEED_PAGES.forEach((page, i) => {
    for (let day = 0; day < 30; day++) {
      const d = new Date(base)
      d.setUTCDate(base.getUTCDate() + day)
      const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
      const demand = (1 + Math.sin(day / 3 + i) * 0.2 + day * 0.01) * (weekend ? 0.8 : 1)
      const impressions = Math.round((900 - i * 80) * demand)
      // CTR improves as position improves; deterministic per page.
      const ctr = 0.03 + (SEED_PAGES.length - i) * 0.004
      rows.push({
        workspace_id: workspaceId,
        date: d.toISOString().slice(0, 10),
        page_url: page,
        sessions: 0, // GSC has no sessions (a GA metric) — 0 until GA4 lands
        clicks: Math.max(0, Math.round(impressions * ctr)),
        impressions,
        avg_position: Math.max(1, 5 + i * 1.5 - day * 0.08),
      })
    }
  })
  return rows
}

export async function ensureOrganicTrafficSeed(workspaceId: string): Promise<void> {
  const rs = await getClickhouse().query({
    query: 'SELECT count() AS c FROM organic_traffic WHERE workspace_id = {ws:String}',
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { c: string }[]
  if (row && Number(row.c) > 0) return
  await getClickhouse().insert({
    table: 'organic_traffic',
    values: seedOrganicRows(workspaceId),
    format: 'JSONEachRow',
  })
}

/** Per-page organic traffic (clicks/impressions/CTR/avg position) + a daily clicks trend. */
export async function getOrganicTraffic(workspaceId: string): Promise<OrganicTrafficResponse> {
  await ensureOrganicTrafficSeed(workspaceId)

  const pagesRs = await getClickhouse().query({
    query: `
      SELECT page_url AS pageUrl,
        toUInt64(sum(clicks)) AS clicks,
        toUInt64(sum(impressions)) AS impressions,
        toFloat64(avg(avg_position)) AS avgPosition
      FROM organic_traffic
      WHERE workspace_id = {ws:String}
      GROUP BY page_url ORDER BY clicks DESC`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const pageRows = (await pagesRs.json()) as {
    pageUrl: string
    clicks: number
    impressions: number
    avgPosition: number
  }[]
  const pages: OrganicPage[] = pageRows.map((p) => ({
    pageUrl: p.pageUrl,
    clicks: Number(p.clicks),
    impressions: Number(p.impressions),
    ctr: p.impressions > 0 ? Math.round((Number(p.clicks) / Number(p.impressions)) * 1000) / 10 : 0,
    avgPosition: Math.round(p.avgPosition * 10) / 10,
  }))

  const trendRs = await getClickhouse().query({
    query: `
      SELECT toString(date) AS date,
        toUInt64(sum(clicks)) AS clicks,
        toUInt64(sum(impressions)) AS impressions
      FROM organic_traffic
      WHERE workspace_id = {ws:String}
      GROUP BY date ORDER BY date`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const trend = ((await trendRs.json()) as { date: string; clicks: number; impressions: number }[]).map(
    (t): OrganicTrafficPoint => ({
      date: t.date,
      clicks: Number(t.clicks),
      impressions: Number(t.impressions),
    }),
  )

  const totalClicks = pages.reduce((s, p) => s + p.clicks, 0)
  const totalImpressions = pages.reduce((s, p) => s + p.impressions, 0)
  const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0
  const avgPosition = pages.length
    ? Math.round((pages.reduce((s, p) => s + p.avgPosition, 0) / pages.length) * 10) / 10
    : 0

  return {
    pages,
    trend,
    summary: { pages: pages.length, totalClicks, totalImpressions, avgCtr, avgPosition },
  }
}
