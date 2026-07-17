"use client";
import { useQuery } from "@tanstack/react-query";
import type { TopOrganicPage } from "@growthos/types";
import { scoreKeywords } from "@growthos/logic";
import { rawKeywords } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

function mockPages(): TopOrganicPage[] {
  return scoreKeywords(rawKeywords)
    .filter((k) => k.currentPosition !== null && k.currentPosition <= 10 && k.volume >= 5000)
    .map((k) => ({
      keyword: k.keyword,
      volume: k.volume,
      currentPosition: k.currentPosition,
      opportunityScore: k.opportunityScore,
    }));
}

export function useTopPages(workspaceId: string | null | undefined) {
  return useQuery<{ data: TopOrganicPage[]; source: "live" | "mock" }>({
    queryKey: ["top-pages", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: TopOrganicPage[]; total: number }>(
              `/workspaces/${workspaceId}/seo/top-pages`
            )
          ).data,
        mockPages
      ),
  });
}
