import type { GrowthHubDaily, GrowthHubResponse } from '@growthos/types'
import {
  getDataBounds,
  previousWindow,
  resolveWindow,
  windowLength,
  type DateWindow,
  type DateWindowQuery,
} from './date-window.js'
import { getClickhouse, ensureAdPerformanceSeed, REVENUE_FACTOR } from './analytics.js'
import { ensureOrganicTrafficSeed } from './seo.js'

/**
 * Growth Hub headline metrics: the outcome numbers the dashboard home leads with, each paired with
 * the equivalent figure from the preceding window so the UI can show a trend without a second call.
 * Also carries the Goal Simulator's baseline, since it is derived from exactly these aggregates —
 * a separate endpoint would run the same two queries again.
 *
 * WINDOWING. The window is an explicit inclusive `[from, to]` (see date-window.ts), and every
 * delta compares it against the equal-length window immediately before it. When the caller sends no
 * range, the default is anchored to the newest day with DATA rather than to `today()`: seeded
 * workspaces sit at a fixed date in the past, so a calendar-relative default would return zero rows
 * for exactly the workspaces that have no live integration yet and the dashboard would read as
 * empty. The date picker anchors its presets the same way, against the `dataFrom`/`dataThrough`
 * bounds returned here.
 *
 * Both tables are queried over the same window. `getDataBounds` narrows the bounds to the span both
 * pipelines cover, so a range the picker allows is never half-empty. */

interface AdAggregates {
  googleSpendCur: number
  googleSpendPrev: number
  metaSpendCur: number
  metaSpendPrev: number
  convValueCur: number
  convValuePrev: number
  conversionsCur: number
  conversionsPrev: number
  googleConversionsCur: number
  metaConversionsCur: number
  clicksCur: number
}

async function queryAdAggregates(workspaceId: string, w: DateWindow): Promise<AdAggregates> {
  const prev = previousWindow(w)
  const rs = await getClickhouse().query({
    query: `
      SELECT
        toFloat64(sumIf(spend, platform = 'google_ads' AND date >= {from:Date} AND date <= {to:Date})) AS googleSpendCur,
        toFloat64(sumIf(spend, platform = 'google_ads' AND date >= {pFrom:Date} AND date <= {pTo:Date})) AS googleSpendPrev,
        toFloat64(sumIf(spend, platform = 'meta_ads' AND date >= {from:Date} AND date <= {to:Date})) AS metaSpendCur,
        toFloat64(sumIf(spend, platform = 'meta_ads' AND date >= {pFrom:Date} AND date <= {pTo:Date})) AS metaSpendPrev,
        toFloat64(sumIf(conversion_value, date >= {from:Date} AND date <= {to:Date})) AS convValueCur,
        toFloat64(sumIf(conversion_value, date >= {pFrom:Date} AND date <= {pTo:Date})) AS convValuePrev,
        toFloat64(sumIf(conversions, date >= {from:Date} AND date <= {to:Date})) AS conversionsCur,
        toFloat64(sumIf(conversions, date >= {pFrom:Date} AND date <= {pTo:Date})) AS conversionsPrev,
        toFloat64(sumIf(conversions, platform = 'google_ads' AND date >= {from:Date} AND date <= {to:Date})) AS googleConversionsCur,
        toFloat64(sumIf(conversions, platform = 'meta_ads' AND date >= {from:Date} AND date <= {to:Date})) AS metaConversionsCur,
        toFloat64(sumIf(clicks, date >= {from:Date} AND date <= {to:Date})) AS clicksCur
      FROM ad_performance
      WHERE workspace_id = {ws:String}`,
    query_params: { ws: workspaceId, from: w.from, to: w.to, pFrom: prev.from, pTo: prev.to },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as AdAggregates[]
  return (
    row ?? {
      googleSpendCur: 0,
      googleSpendPrev: 0,
      metaSpendCur: 0,
      metaSpendPrev: 0,
      convValueCur: 0,
      convValuePrev: 0,
      conversionsCur: 0,
      conversionsPrev: 0,
      googleConversionsCur: 0,
      metaConversionsCur: 0,
      clicksCur: 0,
    }
  )
}

interface OrganicAggregates {
  clicksCur: number
  clicksPrev: number
}

async function queryOrganicAggregates(workspaceId: string, w: DateWindow): Promise<OrganicAggregates> {
  const prev = previousWindow(w)
  const rs = await getClickhouse().query({
    query: `
      SELECT
        toFloat64(sumIf(clicks, date >= {from:Date} AND date <= {to:Date})) AS clicksCur,
        toFloat64(sumIf(clicks, date >= {pFrom:Date} AND date <= {pTo:Date})) AS clicksPrev
      FROM organic_traffic
      WHERE workspace_id = {ws:String}`,
    query_params: { ws: workspaceId, from: w.from, to: w.to, pFrom: prev.from, pTo: prev.to },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as OrganicAggregates[]
  return row ?? { clicksCur: 0, clicksPrev: 0 }
}

/**
 * Per-day values across the current window, for the tile sparklines. Windowed exactly like the
 * aggregates above — from `max(date)`, not `today()` — so the sparkline covers the same span the
 * headline number does.
 *
 * The day column is aliased `day`, not `date`. Aliasing it `date` shadows the Date column of the
 * same name, and `GROUP BY date` then resolves to the String alias while `WHERE date > curStart`
 * still compares the Date — which ClickHouse rejects outright ("no supertype for types String,
 * Date"). `getMerTrend` gets away with `AS date` only because it has no date comparison.
 */
async function queryDailySeries(workspaceId: string, w: DateWindow): Promise<GrowthHubDaily> {
  const params = { ws: workspaceId, from: w.from, to: w.to }
  const adRs = await getClickhouse().query({
    query: `
      SELECT toString(date) AS day,
        toFloat64(sum(spend)) AS spend,
        toFloat64(sum(conversion_value)) AS convValue,
        toFloat64(sum(conversions)) AS conversions
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND date >= {from:Date} AND date <= {to:Date}
      GROUP BY day ORDER BY day`,
    query_params: params,
    format: 'JSONEachRow',
  })
  const adRows = (await adRs.json()) as { spend: number; convValue: number; conversions: number }[]

  const orgRs = await getClickhouse().query({
    query: `
      SELECT toString(date) AS day, toFloat64(sum(clicks)) AS clicks
      FROM organic_traffic
      WHERE workspace_id = {ws:String} AND date >= {from:Date} AND date <= {to:Date}
      GROUP BY day ORDER BY day`,
    query_params: params,
    format: 'JSONEachRow',
  })
  const orgRows = (await orgRs.json()) as { clicks: number }[]

  return {
    revenue: adRows.map((r) => Math.round(r.convValue * REVENUE_FACTOR)),
    adSpend: adRows.map((r) => round2(r.spend)),
    conversions: adRows.map((r) => Math.round(r.conversions)),
    organicClicks: orgRows.map((r) => Math.round(r.clicks)),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function getGrowthHub(
  workspaceId: string,
  query: DateWindowQuery = {},
): Promise<GrowthHubResponse> {
  // Same generate-if-empty contract the MER and SEO surfaces use, so a brand-new workspace lands on
  // a populated dashboard rather than four zeroes.
  await Promise.all([ensureAdPerformanceSeed(workspaceId), ensureOrganicTrafficSeed(workspaceId)])

  // Bounds first: the default window is anchored to the newest day with data, and the picker needs
  // them to keep the calendar inside what the workspace can actually answer for.
  const bounds = await getDataBounds(workspaceId)
  const window = resolveWindow(bounds, query)

  const [ads, organic, daily] = await Promise.all([
    queryAdAggregates(workspaceId, window),
    queryOrganicAggregates(workspaceId, window),
    queryDailySeries(workspaceId, window),
  ])

  // Sessions proxy: paid clicks + organic clicks. GSC exposes no sessions metric (see
  // `toOrganicRows` in gsc-sync.ts, which writes sessions: 0), so clicks is the closest real signal.
  const sessions = ads.clicksCur + organic.clicksCur

  return {
    windowDays: windowLength(window),
    window,
    dataFrom: bounds.first,
    dataThrough: bounds.last,
    metrics: {
      revenue: {
        current: Math.round(ads.convValueCur * REVENUE_FACTOR),
        previous: Math.round(ads.convValuePrev * REVENUE_FACTOR),
      },
      googleSpend: { current: round2(ads.googleSpendCur), previous: round2(ads.googleSpendPrev) },
      metaSpend: { current: round2(ads.metaSpendCur), previous: round2(ads.metaSpendPrev) },
      organicClicks: { current: Math.round(organic.clicksCur), previous: Math.round(organic.clicksPrev) },
      conversions: { current: Math.round(ads.conversionsCur), previous: Math.round(ads.conversionsPrev) },
    },
    daily,
    channels: {
      seo: { organicClicks: Math.round(organic.clicksCur) },
      google: { conversions: Math.round(ads.googleConversionsCur) },
      meta: { conversions: Math.round(ads.metaConversionsCur) },
    },
    baseline: {
      // Guarded against a zero denominator on a workspace with no traffic/conversions yet — the
      // simulator would otherwise project NaN into the UI.
      currentConversionRate: sessions > 0 ? ads.conversionsCur / sessions : 0,
      currentAOV: ads.conversionsCur > 0 ? round2(ads.convValueCur / ads.conversionsCur) : 0,
      currentSessions: Math.round(sessions),
    },
  }
}
