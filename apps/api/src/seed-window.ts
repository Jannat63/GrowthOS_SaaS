import type { ClickHouseClient } from '@clickhouse/client'
import { SEED_DAYS, SEED_LAST_DAY, seedDates } from '@growthos/logic/fixtures'

/**
 * The shape of every seeded ClickHouse window (ad_performance, organic_traffic).
 *
 * The window itself — SEED_DAYS, SEED_LAST_DAY and the date list — now lives in
 * `@growthos/logic/fixtures/seed`, because `apps/web` has to generate the identical window for its
 * offline fallback and cannot import from `apps/api`. It used to be copied by hand into
 * `apps/web/lib/mock-data/mer.ts`. Re-exported here so this module stays the one place the API
 * asks about the seeded window, and so the invariant below keeps a home next to the query that
 * depends on it.
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
export { SEED_DAYS, SEED_LAST_DAY, seedDates }

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
