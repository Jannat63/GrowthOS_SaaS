import {
  analyzeCampaigns,
  detectWastedSpend,
  summarizeCampaigns,
  type CampaignInput,
  type CampaignInsight,
  type CampaignSummary,
  type WastedSpendFinding,
} from '@growthos/logic'
import { getClickhouse, ensureAdPerformanceSeed } from './analytics.js'
import { getDataBounds, resolveWindow, type DateWindowQuery } from './date-window.js'

/**
 * Per-campaign efficiency + wasted-spend findings for one ad platform.
 *
 * ONE implementation for both channels. `google-ads.ts` and `meta-ads.ts` held two copies of this
 * function that differed only in the platform literal in the WHERE clause, which is how they came
 * to differ in nothing else and to carry the same two defects.
 */
export type AdPlatform = 'google_ads' | 'meta_ads'

export interface CampaignInsightsResponse {
  campaigns: CampaignInsight[]
  wastedSpend: WastedSpendFinding[]
  summary: CampaignSummary
  /**
   * The window these figures were actually measured over.
   *
   * Both copies of this query ran with NO date filter, summing every seeded day — 180 of them —
   * while the page beside them offered no window control and stated no period. "Total spend" was
   * therefore an all-time figure sitting one nav item away from an Analytics page reporting the
   * same account's spend over 30 days, with nothing on either screen to reconcile them. This is the
   * same defect `OrganicTrafficResponse.period` was added for on the SEO module.
   */
  period: { from: string; to: string }
}

export async function getCampaignInsights(
  workspaceId: string,
  platform: AdPlatform,
  query: DateWindowQuery = {},
): Promise<CampaignInsightsResponse> {
  await ensureAdPerformanceSeed(workspaceId)
  const w = resolveWindow(await getDataBounds(workspaceId), query)

  const rs = await getClickhouse().query({
    query: `
      SELECT campaign_id AS id,
        any(campaign_name) AS name,
        toUInt64(sum(clicks)) AS clicks,
        toUInt64(sum(conversions)) AS conversions,
        toFloat64(sum(spend)) AS cost,
        toFloat64(sum(conversion_value)) AS conversionValue
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND platform = {platform:String}
        AND date >= {from:Date} AND date <= {to:Date}
      GROUP BY campaign_id
      HAVING cost > 0 OR clicks > 0
      ORDER BY cost DESC`,
    // `platform` is bound rather than interpolated even though it comes from this module's own
    // union — the column is an Enum8, and ClickHouse compares it to the string form.
    query_params: { ws: workspaceId, platform, from: w.from, to: w.to },
    format: 'JSONEachRow',
  })
  const rows = (await rs.json()) as {
    id: string
    name: string
    clicks: number
    conversions: number
    cost: number
    conversionValue: number
  }[]

  const inputs: CampaignInput[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    clicks: Number(r.clicks),
    conversions: Number(r.conversions),
    cost: Math.round(Number(r.cost) * 100) / 100,
    conversionValue: Math.round(Number(r.conversionValue) * 100) / 100,
  }))

  const campaigns = analyzeCampaigns(inputs)
  return {
    campaigns,
    wastedSpend: detectWastedSpend(inputs),
    summary: summarizeCampaigns(campaigns),
    period: w,
  }
}
