import {
  analyzeCampaigns,
  detectWastedSpend,
  summarizeCampaigns,
  type CampaignInput,
} from "@growthos/logic";
import { seedAdRows, type SeedPlatform } from "@growthos/logic/fixtures";
import type { CampaignInsightsResponse } from "@/lib/hooks/useCampaignInsights";
import { seedWindow } from "./seed-window";

/**
 * Offline campaign insights, rolled up from the SAME seed rows the API stores in ClickHouse.
 *
 * WHAT THIS REPLACED. Both ads pages fell back to `analyzeCampaigns(adCampaigns)` — the fixture
 * roster's own literal figures — while live read a seed that wrote exactly ONE campaign per
 * platform. Measured over the same account, offline showed four Meta campaigns totalling $5,691 at
 * 2.44x with a red wasted-spend panel; live showed a single-row table totalling $14,950 at 3.05x
 * with no wasted spend to report and the panel gone entirely. Connecting a backend replaced the
 * page's whole subject, not just its numbers.
 *
 * The seed now writes the roster and this rolls the same rows up the same way the API's SQL does —
 * `GROUP BY campaign_id` over a date window, summing clicks, conversions, spend and value — so the
 * two answers are the same answer.
 */
export function campaignsMock(
  platform: SeedPlatform,
  range: { from: string; to: string } | null,
  days: number
): CampaignInsightsResponse {
  const window = seedWindow(range, days);
  const dates = new Set(window);
  const by = new Map<string, CampaignInput>();

  for (const r of seedAdRows()) {
    if (r.platform !== platform || !dates.has(r.date)) continue;
    const c = by.get(r.campaignId) ?? {
      id: r.campaignId,
      name: r.campaignName,
      clicks: 0,
      conversions: 0,
      cost: 0,
      conversionValue: 0,
    };
    c.clicks += r.clicks;
    c.conversions += r.conversions;
    c.cost += r.spend;
    c.conversionValue += r.conversionValue;
    by.set(r.campaignId, c);
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const inputs = [...by.values()]
    .map((c) => ({ ...c, cost: round2(c.cost), conversionValue: round2(c.conversionValue) }))
    // `HAVING cost > 0 OR clicks > 0` then `ORDER BY cost DESC`, matching the query. A campaign
    // that did nothing at all in the window is not a row; a real account has paused campaigns.
    .filter((c) => c.cost > 0 || c.clicks > 0)
    .sort((a, b) => b.cost - a.cost);

  const campaigns = analyzeCampaigns(inputs);
  return {
    campaigns,
    wastedSpend: detectWastedSpend(inputs),
    summary: summarizeCampaigns(campaigns),
    period: window.length
      ? { from: window[0]!, to: window[window.length - 1]! }
      : null,
  };
}
