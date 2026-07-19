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

export interface MetaAdsInsights {
  campaigns: CampaignInsight[]
  wastedSpend: WastedSpendFinding[]
  summary: CampaignSummary
}

/** Meta Ads campaign insights: per-campaign efficiency + wasted-spend findings, computed by the
 * shared @growthos/logic campaign advisor over ClickHouse ad_performance (meta_ads platform).
 * Seeded until a real Meta connection syncs; live campaign push is gated on Meta App Review. */
export async function getMetaCampaignInsights(workspaceId: string): Promise<MetaAdsInsights> {
  await ensureAdPerformanceSeed(workspaceId)
  const rs = await getClickhouse().query({
    query: `
      SELECT campaign_id AS id,
        any(campaign_name) AS name,
        toUInt64(sum(clicks)) AS clicks,
        toUInt64(sum(conversions)) AS conversions,
        toFloat64(sum(spend)) AS cost,
        toFloat64(sum(conversion_value)) AS conversionValue
      FROM ad_performance
      WHERE workspace_id = {ws:String} AND platform = 'meta_ads'
      GROUP BY campaign_id
      ORDER BY cost DESC`,
    query_params: { ws: workspaceId },
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
  }
}
