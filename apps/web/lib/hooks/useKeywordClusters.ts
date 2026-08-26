"use client";
import { useQuery } from "@tanstack/react-query";
import { clusterKeywords } from "@growthos/logic";
import type { SeoClustersResponse } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";
import { mockRankings } from "./useKeywordRankings";

// Runs the IDENTICAL engine the API runs, over the identical fixture the Rank tracker renders — so
// mock mode shows the real grouping this algorithm produces, not a hand-written impression of one.
// The shaping below mirrors `getKeywordClusters` in apps/api/src/seo.ts; the clustering itself is
// shared code, so only the aggregation could ever drift.
function mockClusters(): SeoClustersResponse {
  const { keywords } = mockRankings();
  const positionByKeyword = new Map(keywords.map((k) => [k.keyword, k.position]));

  const clusters = clusterKeywords(keywords.map((k) => k.keyword)).map((cluster) => {
    const members = cluster.keywords
      .map((keyword) => ({ keyword, position: positionByKeyword.get(keyword) ?? 0 }))
      .sort((a, b) => a.position - b.position);
    const avgPosition = members.length
      ? Math.round((members.reduce((s, m) => s + m.position, 0) / members.length) * 10) / 10
      : 0;
    return {
      clusterName: cluster.clusterName,
      intentVerified: cluster.intentVerified,
      keywords: members,
      avgPosition,
    };
  });

  clusters.sort((a, b) => b.keywords.length - a.keywords.length || a.avgPosition - b.avgPosition);

  return {
    clusters,
    summary: {
      clusters: clusters.length,
      keywords: keywords.length,
      largestCluster: clusters.reduce((m, c) => Math.max(m, c.keywords.length), 0),
      singletons: clusters.filter((c) => c.keywords.length === 1).length,
    },
  };
}

export function useKeywordClusters(workspaceId: string | null | undefined) {
  return useQuery<{ data: SeoClustersResponse; source: "live" | "mock" }>({
    queryKey: ["seo-clusters", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<SeoClustersResponse>(`/workspaces/${workspaceId}/seo/clusters`),
        mockClusters
      ),
  });
}
