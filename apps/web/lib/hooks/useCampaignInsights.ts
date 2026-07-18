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
import { adCampaigns } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

export interface GoogleAdsInsights {
  campaigns: CampaignInsight[];
  wastedSpend: WastedSpendFinding[];
  summary: CampaignSummary;
}

// Mock fallback runs the SAME advisor engine over the shared fixture the tests use, so live and
// fallback agree in shape and behavior.
function mockInsights(): GoogleAdsInsights {
  const campaigns = analyzeCampaigns(adCampaigns);
  return {
    campaigns,
    wastedSpend: detectWastedSpend(adCampaigns),
    summary: summarizeCampaigns(campaigns),
  };
}

export function useCampaignInsights(workspaceId: string | null | undefined) {
  return useQuery<{ data: GoogleAdsInsights; source: "live" | "mock" }>({
    queryKey: ["google-ads-campaigns", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<GoogleAdsInsights>(`/workspaces/${workspaceId}/google-ads/campaigns`),
        mockInsights
      ),
  });
}
