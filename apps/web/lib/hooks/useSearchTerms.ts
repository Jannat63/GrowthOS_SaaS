"use client";
import { useQuery } from "@tanstack/react-query";
import type { ScoredSearchTerm } from "@growthos/types";
import { analyzeSearchTerms } from "@growthos/logic";
import { searchTerms } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

function mockScored(): ScoredSearchTerm[] {
  return analyzeSearchTerms(searchTerms).map((t) => ({
    term: t.term,
    clicks: t.clicks,
    conversions: t.conversions,
    cost: t.cost,
    organicPosition: t.organicPosition,
    conversionRate: t.conversionRate,
    recommendationType: t.recommendation.type,
    message: t.recommendation.message,
  }));
}

export function useSearchTerms(workspaceId: string | null | undefined) {
  return useQuery<{ data: ScoredSearchTerm[]; source: "live" | "mock" }>({
    queryKey: ["search-terms", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ searchTerms: ScoredSearchTerm[]; total: number }>(
              `/workspaces/${workspaceId}/google-ads/search-terms`
            )
          ).searchTerms,
        mockScored
      ),
  });
}
