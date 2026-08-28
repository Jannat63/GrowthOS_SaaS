"use client";
import { useQuery } from "@tanstack/react-query";
import type { CampaignInsight, CampaignSummary, WastedSpendFinding } from "@growthos/logic";
import { api } from "@/lib/api/client";
import { campaignsMock } from "@/lib/mock-data/campaigns";
import { rangeLength, type DateRange } from "@/lib/stores/range";
import { liveOrMock } from "./liveOrMock";
import { rangeKey, rangeQuery } from "./rangeQuery";

export interface CampaignInsightsResponse {
  campaigns: CampaignInsight[];
  wastedSpend: WastedSpendFinding[];
  summary: CampaignSummary;
  /**
   * The window these figures were measured over.
   *
   * The endpoint took no window and summed every seeded day, so "Total spend" was an all-time
   * figure on a page that stated no period — one nav item from an Analytics page reporting the same
   * account over 30 days. `null` only when the window contains no data at all.
   */
  period: { from: string; to: string } | null;
}

/** Google Ads campaign insights. */
export function useCampaignInsights(
  workspaceId: string | null | undefined,
  range: DateRange | null
) {
  return usePlatformCampaigns("google_ads", "google-ads", workspaceId, range);
}

/** Meta Ads campaign insights — same endpoint shape, same engine, other platform. */
export function useMetaCampaignInsights(
  workspaceId: string | null | undefined,
  range: DateRange | null
) {
  return usePlatformCampaigns("meta_ads", "meta-ads", workspaceId, range);
}

function usePlatformCampaigns(
  platform: "google_ads" | "meta_ads",
  segment: "google-ads" | "meta-ads",
  workspaceId: string | null | undefined,
  range: DateRange | null
) {
  // The mock has no server to resolve a default against, so it mirrors the request's own length.
  const days = range ? rangeLength(range) : 30;
  return useQuery<{ data: CampaignInsightsResponse; source: "live" | "mock" }>({
    queryKey: [`${segment}-campaigns`, workspaceId, rangeKey(range)],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () =>
          api.get<CampaignInsightsResponse>(
            `/workspaces/${workspaceId}/${segment}/campaigns${rangeQuery(range)}`
          ),
        () => campaignsMock(platform, range, days)
      ),
  });
}
