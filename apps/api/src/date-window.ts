import { getClickhouse } from './analytics.js'

/**
 * An explicit, inclusive date window: every dashboard figure is measured over `[from, to]`.
 *
 * This replaced a bare `days: number`, which could only ever express "the last N days ending at the
 * most recent data" — fine for a segmented 7/30/90 control, useless for a date picker, since an
 * arbitrary range that does not end at max(date) has no representation in it at all.
 */
export interface DateWindow {
  from: string // YYYY-MM-DD, inclusive
  to: string // YYYY-MM-DD, inclusive
}

/**
 * What a client may ask for. Properties are explicitly `| undefined` because the API compiles under
 * `exactOptionalPropertyTypes`, where an optional property and a property that may be undefined are
 * different types — and zod's output for `.optional()` is the latter.
 */
export interface DateWindowQuery {
  from?: string | undefined
  to?: string | undefined
  days?: number | undefined
}

/** The span of dates a workspace actually has data for, across both seeded/synced tables. */
export interface DataBounds {
  first: string | null
  last: string | null
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

/** `max`/`min` over an empty table return ClickHouse's zero date, not null. */
const realDate = (d: string | null | undefined) => (d && d !== '1970-01-01' ? d : null)

/** Inclusive length of a window, in days. */
export function windowLength(w: DateWindow): number {
  const from = new Date(`${w.from}T00:00:00Z`).getTime()
  const to = new Date(`${w.to}T00:00:00Z`).getTime()
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1)
}

/**
 * The window immediately before `w`, of the same length — what every delta on the dashboard is
 * measured against. Period-over-preceding-period, so it is always well defined for any range the
 * picker can produce.
 */
export function previousWindow(w: DateWindow): DateWindow {
  const len = windowLength(w)
  return { from: addDays(w.from, -len), to: addDays(w.from, -1) }
}

/**
 * Earliest and latest date this workspace has data for, across ad_performance and organic_traffic.
 *
 * `first` is the LATER of the two minima and `last` the EARLIER of the two maxima: outside that
 * span one of the pipelines has nothing, and a blended figure covering it would be understated
 * without saying so. The date picker uses these to bound the calendar, so a user cannot select a
 * range that is silently half-empty.
 */
export async function getDataBounds(workspaceId: string): Promise<DataBounds> {
  const rs = await getClickhouse().query({
    query: `
      SELECT
        toString(max(firstDate)) AS first,
        toString(min(lastDate)) AS last
      FROM (
        SELECT min(date) AS firstDate, max(date) AS lastDate
        FROM ad_performance WHERE workspace_id = {ws:String}
        UNION ALL
        SELECT min(date) AS firstDate, max(date) AS lastDate
        FROM organic_traffic WHERE workspace_id = {ws:String}
      )`,
    query_params: { ws: workspaceId },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as { first: string; last: string }[]
  return { first: realDate(row?.first), last: realDate(row?.last) }
}

/**
 * Turn whatever the client asked for into a concrete window.
 *
 * The default is anchored to `bounds.last` — the most recent day with data — and NOT to today, and
 * that is load-bearing rather than a convenience. Seeded workspaces are anchored at a fixed date in
 * the past, so "the last 30 calendar days" is a window they have no rows in at all: the dashboard
 * would render as empty for exactly the workspaces that have no live integration yet, which is all
 * of them before onboarding. `growth-hub.ts` and `intelligence.ts` already measure from max(date)
 * for this reason; this keeps the picker honest with them.
 */
export function resolveWindow(bounds: DataBounds, query: DateWindowQuery): DateWindow {
  if (query.from && query.to) return { from: query.from, to: query.to }

  const days = query.days ?? 30
  // With no data at all there is nothing to anchor to; fall back to today so the shape is still
  // valid and every aggregate comes back zero rather than throwing.
  const to = bounds.last ?? iso(new Date())
  return { from: addDays(to, -(days - 1)), to }
}
