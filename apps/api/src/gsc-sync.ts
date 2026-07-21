import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { getClickhouse } from './analytics.js'
import { getValidAccessToken, type ConnectionRow } from './oauth/connections.js'

// Google Search Console live sync → ClickHouse (M3 P3.0). GSC Search Analytics query dimension →
// keyword_rankings; page dimension → organic_traffic. A today-stamped 30-day snapshot; the scheduled
// sync (P3.4) will build a proper daily time series.

export interface GscRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

// GSC query rows → keyword_rankings rows. Position is fractional in GSC; keyword_rankings.position is
// UInt16, so round. GSC gives no stable keyword id — use the query text.
export function toKeywordRows(
  workspaceId: string,
  date: string,
  rows: GscRow[],
): Record<string, unknown>[] {
  return rows.map((r) => ({
    workspace_id: workspaceId,
    keyword_id: r.keys[0] ?? '',
    keyword: r.keys[0] ?? '',
    date,
    position: Math.max(0, Math.round(r.position)),
    device: 'desktop',
    location: '',
    has_ai_overview: 0,
    cited_in_ai_overview: 0,
  }))
}

// GSC page rows → organic_traffic rows. GSC has no `sessions` (a GA metric) → 0.
export function toOrganicRows(
  workspaceId: string,
  date: string,
  rows: GscRow[],
): Record<string, unknown>[] {
  return rows.map((r) => ({
    workspace_id: workspaceId,
    date,
    page_url: r.keys[0] ?? '',
    sessions: 0,
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    avg_position: r.position,
  }))
}

function dateRange(days: number) {
  const end = new Date()
  const start = new Date(end.getTime() - days * 86_400_000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: iso(start), endDate: iso(end) }
}

async function gscQuery(
  accessToken: string,
  siteUrl: string,
  dimensions: string[],
  days: number,
): Promise<GscRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dateRange(days), dimensions, rowLimit: 1000 }),
  })
  if (!res.ok) throw new Error(`GSC searchAnalytics failed: ${res.status}`)
  const j = (await res.json()) as { rows?: GscRow[] }
  return j.rows ?? []
}

export async function syncGscConnection(conn: ConnectionRow): Promise<{ keywords: number; pages: number }> {
  try {
    const siteUrl = (conn.metadata as { siteUrl?: string } | null)?.siteUrl ?? conn.accountId
    const accessToken = await getValidAccessToken(conn)
    const today = new Date().toISOString().slice(0, 10)
    const [queryRows, pageRows] = await Promise.all([
      gscQuery(accessToken, siteUrl, ['query'], 30),
      gscQuery(accessToken, siteUrl, ['page'], 30),
    ])

    const ch = getClickhouse()
    // Replace today's snapshot (idempotent per run).
    await ch.command({
      query: 'ALTER TABLE keyword_rankings DELETE WHERE workspace_id = {ws:String} AND date = {d:String}',
      query_params: { ws: conn.workspaceId, d: today },
    })
    await ch.command({
      query: 'ALTER TABLE organic_traffic DELETE WHERE workspace_id = {ws:String} AND date = {d:String}',
      query_params: { ws: conn.workspaceId, d: today },
    })
    if (queryRows.length) {
      await ch.insert({ table: 'keyword_rankings', values: toKeywordRows(conn.workspaceId, today, queryRows), format: 'JSONEachRow' })
    }
    if (pageRows.length) {
      await ch.insert({ table: 'organic_traffic', values: toOrganicRows(conn.workspaceId, today, pageRows), format: 'JSONEachRow' })
    }

    await db
      .update(schema.platformConnections)
      .set({ lastSyncedAt: new Date(), syncError: null, updatedAt: new Date() })
      .where(eq(schema.platformConnections.id, conn.id))
    return { keywords: queryRows.length, pages: pageRows.length }
  } catch (e) {
    await db
      .update(schema.platformConnections)
      .set({ syncError: String(e), updatedAt: new Date() })
      .where(eq(schema.platformConnections.id, conn.id))
    throw e
  }
}
