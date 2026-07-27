"use client";
import { useQuery } from "@tanstack/react-query";
import type { Recommendation } from "@growthos/types";
import {
  generateCrossChannelRecommendations,
  scoreKeywords,
  analyzeSearchTerms,
  detectFatigueAll,
  analyzeCampaigns,
  toRecommendation,
} from "@growthos/logic";
import { rawKeywords, searchTerms, creatives, adCampaigns, metaCampaigns } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

// Mock fallback runs the SAME engine + mapper over the SAME fixtures the API uses,
// so live and fallback agree in both shape and content.
function mockRecommendations(workspaceId: string): Recommendation[] {
  return generateCrossChannelRecommendations({
    keywords: scoreKeywords(rawKeywords),
    searchTerms: analyzeSearchTerms(searchTerms),
    creatives: detectFatigueAll(creatives),
    googleCampaigns: analyzeCampaigns(adCampaigns),
    metaCampaigns: analyzeCampaigns(metaCampaigns),
  })
    .map((r) => {
      const m = toRecommendation(r, workspaceId);
      return {
        id: r.id,
        workspaceId: m.workspaceId,
        type: m.type,
        sourceChannel: m.sourceChannel,
        targetChannel: m.targetChannel,
        title: m.title,
        body: m.body,
        actionLabel: m.actionLabel,
        impactScore: m.impactScore,
        effortScore: m.effortScore,
        urgencyScore: m.urgencyScore,
        compositeScore: m.compositeScore,
        status: m.status,
        assignedTo: null,
        dueDate: null,
      } satisfies Recommendation;
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Cross-channel recommendation queue — now backend-owned (M2 P2.3a). Fetches the persisted,
 * generated recommendations; on failure falls back to the same engine over the same fixtures.
 */
export function useRecommendations(workspaceId: string | null | undefined) {
  return useQuery<{ data: Recommendation[]; source: "live" | "mock" }>({
    queryKey: ["recommendations", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: Recommendation[]; total: number }>(
              `/workspaces/${workspaceId}/recommendations`
            )
          ).data,
        () => mockRecommendations(workspaceId as string)
      ),
  });
}
