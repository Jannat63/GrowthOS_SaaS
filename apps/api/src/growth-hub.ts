import type { GrowthHubResponse } from '@growthos/types'
import { getClickhouse, ensureAdPerformanceSeed, REVENUE_FACTOR } from './analytics.js'
import { ensureOrganicTrafficSeed } from './seo.js'

/**
 * Growth Hub headline metrics: the outcome numbers the dashboard home leads with, each paired with
 * the equivalent figure from the preceding window so the UI can show a trend without a second call.
 * Also carries the Goal Simulator's baseline, since it is derived from exactly these aggregates —
 * a separate endpoint would run the same two queries again.
 *
 * WINDOWING — the important detail. Both windows are measured backwards from the most recent date
 * *present in the data*, not from `today()`. Every seeded workspace is anchored at a fixed base date
 * (see `seedRows` in analytics.ts / seo.ts), so a calendar-relative `date >= today() - 30` returns
 * zero rows for them while returning real numbers for a GSC-connected workspace — the dashboard
 * would read as empty for exactly the workspaces that have no live integration yet. Measuring from
 * `max(date)` gives "the last 30 days of data you have", which is the same semantics `getMerTrend`
 * already uses (`ORDER BY date DESC LIMIT days`) and stays correct once real syncs stamp today.
 *
 * Paid and organic are windowed independently against their own `max(date)`: they are fed by
 * different pipelines (ad_performance is seeded/ads-synced, organic_traffic is GSC-synced) and can
 * legitimately be current to different days.
 */

const DEFAULT_WINDOW_DAYS = 30

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

async function queryAdAggregates(workspaceId: string, days: number): Promise<AdAggregates> {
  const rs = await getClickhouse().query({
    query: `
      WITH (SELECT max(date) FROM ad_performance WHERE workspace_id = {ws:String}) AS maxDate,
           subtractDays(maxDate, {days:UInt32}) AS curStart,
           subtractDays(maxDate, {days2:UInt32}) AS prevStart
      SELECT
        toFloat64(sumIf(spend, platform = 'google_ads' AND date > curStart)) AS googleSpendCur,
        toFloat64(sumIf(spend, platform = 'google_ads' AND date > prevStart AND date <= curStart)) AS googleSpendPrev,
        toFloat64(sumIf(spend, platform = 'meta_ads' AND date > curStart)) AS metaSpendCur,
        toFloat64(sumIf(spend, platform = 'meta_ads' AND date > prevStart AND date <= curStart)) AS metaSpendPrev,
        toFloat64(sumIf(conversion_value, date > curStart)) AS convValueCur,
        toFloat64(sumIf(conversion_value, date > prevStart AND date <= curStart)) AS convValuePrev,
        toFloat64(sumIf(conversions, date > curStart)) AS conversionsCur,
        toFloat64(sumIf(conversions, date > prevStart AND date <= curStart)) AS conversionsPrev,
        toFloat64(sumIf(conversions, platform = 'google_ads' AND date > curStart)) AS googleConversionsCur,
        toFloat64(sumIf(conversions, platform = 'meta_ads' AND date > curStart)) AS metaConversionsCur,
        toFloat64(sumIf(clicks, date > curStart)) AS clicksCur
      FROM ad_performance
      WHERE workspace_id = {ws:String}`,
    query_params: { ws: workspaceId, days, days2: days * 2 },
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

async function queryOrganicAggregates(workspaceId: string, days: number): Promise<OrganicAggregates> {
  const rs = await getClickhouse().query({
    query: `
      WITH (SELECT max(date) FROM organic_traffic WHERE workspace_id = {ws:String}) AS maxDate,
           subtractDays(maxDate, {days:UInt32}) AS curStart,
           subtractDays(maxDate, {days2:UInt32}) AS prevStart
      SELECT
        toFloat64(sumIf(clicks, date > curStart)) AS clicksCur,
        toFloat64(sumIf(clicks, date > prevStart AND date <= curStart)) AS clicksPrev
      FROM organic_traffic
      WHERE workspace_id = {ws:String}`,
    query_params: { ws: workspaceId, days, days2: days * 2 },
    format: 'JSONEachRow',
  })
  const [row] = (await rs.json()) as OrganicAggregates[]
  return row ?? { clicksCur: 0, clicksPrev: 0 }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function getGrowthHub(
  workspaceId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): Promise<GrowthHubResponse> {
  // Same generate-if-empty contract the MER and SEO surfaces use, so a brand-new workspace lands on
  // a populated dashboard rather than four zeroes.
  await Promise.all([ensureAdPerformanceSeed(workspaceId), ensureOrganicTrafficSeed(workspaceId)])

  const [ads, organic] = await Promise.all([
    queryAdAggregates(workspaceId, windowDays),
    queryOrganicAggregates(workspaceId, windowDays),
  ])

  // Sessions proxy: paid clicks + organic clicks. GSC exposes no sessions metric (see
  // `toOrganicRows` in gsc-sync.ts, which writes sessions: 0), so clicks is the closest real signal.
  const sessions = ads.clicksCur + organic.clicksCur

  return {
    windowDays,
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
