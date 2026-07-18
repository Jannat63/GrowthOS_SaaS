"use client";
import { useQuery } from "@tanstack/react-query";
import {
  analyzeCampaigns,
  detectWastedSpend,
  summarizeCampaigns,
  type CampaignInsight,
  type CampaignSummary,
  type WastedSpendFinding,
} from "@growthos/logic";
import { metaCampaigns } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

export interface MetaAdsInsights {
  campaigns: CampaignInsight[];
  wastedSpend: WastedSpendFinding[];
  summary: CampaignSummary;
}

// Mock runs the SAME advisor engine over the shared meta fixture, so live and fallback agree.
function mockInsights(): MetaAdsInsights {
  const campaigns = analyzeCampaigns(metaCampaigns);
  return {
    campaigns,
    wastedSpend: detectWastedSpend(metaCampaigns),
    summary: summarizeCampaigns(campaigns),
  };
}

export function useMetaCampaignInsights(workspaceId: string | null | undefined) {
  return useQuery<{ data: MetaAdsInsights; source: "live" | "mock" }>({
    queryKey: ["meta-ads-campaigns", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<MetaAdsInsights>(`/workspaces/${workspaceId}/meta-ads/campaigns`),
        mockInsights
      ),
  });
}
