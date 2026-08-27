import type { ClickHouseClient } from '@clickhouse/client'

/**
 * The shape of every seeded ClickHouse window (ad_performance, organic_traffic).
 *
 * THE INVARIANT: SEED_DAYS >= 2 x the largest range a dashboard offers (90 today, in
 * lib/stores/range.ts and the analytics page). The Growth Hub compares a window against the one
 * before it — `growth-hub.ts` derives `prevStart = maxDate - 2 * days` — so at 30 seeded days
 * under a 30-day window the comparison window matched zero rows. Every `previous` came back 0,
 * `deltaPct()` returned null for all of them, and not one trend indicator rendered anywhere in the
 * product. A finished, tested feature was invisible purely because the seed was one window short.
 * Dropping below 2x the largest range re-breaks it, silently, for only the longest range.
 *
 * The window is anchored at its END, so changing SEED_DAYS extends history backwards instead of
 * moving "now". Everything keyed off `max(date)` — the MER trend, both aggregate queries, the
 * weekly report — keeps behaving identically.
 */
export const SEED_DAYS = 180

/** Last seeded day. Fixed rather than `today()` so seeded figures are reproducible across runs. */
export const SEED_LAST_DAY = '2026-07-17'

/** Every date in the seed window, oldest first, as `YYYY-MM-DD`. */
export function seedDates(): string[] {
  const end = new Date(`${SEED_LAST_DAY}T00:00:00Z`)
  const dates: string[] = []
  for (let i = SEED_DAYS - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setUTCDate(end.getUTCDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

/**
 * Which seed dates a workspace is missing from `table`.
 *
 * The seeders used to ask "does this workspace have ANY rows?", which meant a workspace seeded
 * under an older, shorter window kept it forever — widening the window changed nothing for exactly
 * the workspaces that already existed. Asking per-date makes the seed self-healing: extend
 * SEED_DAYS and every workspace backfills on its next read.
 */
export async function missingSeedDates(
  client: ClickHouseClient,
  table: 'ad_performance' | 'organic_traffic',
  workspaceId: string,
): Promise<string[]> {
  const rs = await client.query({
    // Table name is interpolated, not parameterised: ClickHouse does not bind identifiers, and the
    // value is a literal from this module's own union type — never caller input.
    query: `SELECT DISTINCT toString(date) AS date FROM ${table} WHERE workspace_id = {ws:String}`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const rows = (await rs.json()) as { date: string }[]
  const present = new Set(rows.map((r) => r.date))
  return seedDates().filter((d) => !present.has(d))
}
