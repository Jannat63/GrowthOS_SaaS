import { getClickhouse } from './analytics.js'
import type { KeywordRanking, SeoRankingsResponse } from '@growthos/types'

// SEO rank tracking (M3 P3.1, GSC-fed slice). Reads keyword positions from ClickHouse
// `keyword_rankings` — the table P3.0's Google Search Console sync populates. Until a real GSC
// connection syncs, a deterministic 30-day series is seeded so the tracker reads alive (same
// generate-if-empty pattern as ensureAdPerformanceSeed).

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
