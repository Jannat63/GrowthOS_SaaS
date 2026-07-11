"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";
import {
  generateCrossChannelRecommendations,
  type CrossChannelRecommendation,
} from "@/lib/logic/cross-channel-engine";
import { scoreKeywords } from "@/lib/logic/seo-scoring";
import { analyzeSearchTerms } from "@/lib/logic/search-terms-bridge";
import { detectFatigueAll } from "@/lib/logic/creative-fatigue";
import { rawKeywords } from "@/lib/mock-data/seo";
import { searchTerms } from "@/lib/mock-data/google-ads";
import { creatives } from "@/lib/mock-data/meta-ads";

function mockRecommendations(): CrossChannelRecommendation[] {
  return generateCrossChannelRecommendations(
    scoreKeywords(rawKeywords),
    analyzeSearchTerms(searchTerms),
    detectFatigueAll(creatives)
  );
}

/**
 * Cross-channel recommendation queue — the product's core differentiator.
 * Tries the (not-yet-built) recommendations endpoint and falls back to running
 * the cross-channel engine locally over mock data. Endpoint arrives in M2.
 */
export function useRecommendations(workspaceId: string | null | undefined) {
  return useQuery<{
    data: CrossChannelRecommendation[];
    source: "live" | "mock";
  }>({
    queryKey: ["recommendations", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{
              data: CrossChannelRecommendation[];
              total: number;
            }>(`/workspaces/${workspaceId}/recommendations`)
          ).data,
        mockRecommendations
      ),
  });
}
