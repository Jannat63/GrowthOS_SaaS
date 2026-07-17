"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";
import {
  generateCrossChannelRecommendations,
  type CrossChannelRecommendation,
} from "@growthos/logic";
import { scoreKeywords } from "@growthos/logic";
import { analyzeSearchTerms } from "@growthos/logic";
import { detectFatigueAll } from "@growthos/logic";
import { rawKeywords } from "@growthos/logic/fixtures";
import { searchTerms } from "@growthos/logic/fixtures";
import { creatives } from "@growthos/logic/fixtures";

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
