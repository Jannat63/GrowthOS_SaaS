"use client";
import { useQuery } from "@tanstack/react-query";
import type { KeywordClustersResponse } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/**
 * Groups this workspace's already-tracked keywords into topical clusters (pure Jaccard-similarity
 * algorithm, @growthos/logic's clusterKeywords — no third-party API). Real whenever the tracked
 * keywords themselves are real; same-shaped sample output otherwise. Reports "live"/"mock" the
 * same way every other hook here does, so it goes through the same three-state provenance badge.
 */
export function useKeywordClusters(workspaceId: string | null) {
  return useQuery<{ data: KeywordClustersResponse; source: "live" | "mock" }>({
    queryKey: ["keyword-clusters", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<KeywordClustersResponse>(`/workspaces/${workspaceId}/seo/keyword-clusters`),
        () => ({ clusters: [], totalKeywords: 0 }) // no local fixture to fall back to — an empty state is honest here
      ),
  });
}
