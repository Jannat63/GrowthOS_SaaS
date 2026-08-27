"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContentBriefRecord, ContentBriefStatus } from "@growthos/types";
import { analyzeSearchTerms, generateContentBrief } from "@growthos/logic";
import { searchTerms } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/**
 * The offline briefs.
 *
 * This returned `[]`, which meant that with the API unreachable the Content Pipeline rendered
 * opportunity cards with no brief attached — the page's entire deliverable disappeared and what
 * was left looked like a bug rather than a fallback. The same four fixtures the API seeds from are
 * run through the same generator here.
 *
 * `recommendationId` mirrors the offline queue's id scheme (`p2o:<term>` — see
 * useRecommendations.buildOfflineQueue), so a brief still finds its recommendation offline.
 */
function mockBriefs(workspaceId: string): ContentBriefRecord[] {
  return analyzeSearchTerms(searchTerms)
    .filter((t) => t.recommendation.type === "paid-proven-organic-needed")
    .map((t) => ({
      id: `brief:${t.term}`,
      workspaceId,
      recommendationId: `p2o:${t.term}`,
      keyword: t.term,
      status: "draft" as ContentBriefStatus,
      brief: generateContentBrief(t.term),
      source: "google_ads_search_term",
      publishedUrl: null,
      createdAt: null,
    }));
}

export function useContentBriefs(workspaceId: string | null | undefined) {
  return useQuery<{ data: ContentBriefRecord[]; source: "live" | "mock" }>({
    queryKey: ["content-briefs", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: ContentBriefRecord[]; total: number }>(
              `/workspaces/${workspaceId}/content-briefs`
            )
          ).data,
        () => mockBriefs(workspaceId as string)
      ),
  });
}

/**
 * Move a brief along the pipeline.
 *
 * Optimistic, like the recommendation actions: the stage chip is the only feedback the action
 * produces, so waiting for a round trip to change it reads as a button that did nothing.
 */
export function useContentBriefActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ["content-briefs", workspaceId];

  return useMutation<
    unknown,
    Error,
    { briefId: string; status: ContentBriefStatus; publishedUrl?: string | null },
    { previous: { data: ContentBriefRecord[]; source: "live" | "mock" } | undefined }
  >({
    mutationFn: ({ briefId, status, publishedUrl }) =>
      api.patch(`/workspaces/${workspaceId}/content-briefs/${briefId}`, {
        status,
        ...(publishedUrl === undefined ? {} : { publishedUrl }),
      }),

    onMutate: async ({ briefId, status, publishedUrl }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<{
        data: ContentBriefRecord[];
        source: "live" | "mock";
      }>(key);
      if (previous) {
        qc.setQueryData(key, {
          ...previous,
          data: previous.data.map((b) =>
            b.id === briefId
              ? {
                  ...b,
                  status,
                  publishedUrl:
                    status === "published" ? (publishedUrl ?? b.publishedUrl) : null,
                }
              : b
          ),
        });
      }
      return { previous };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
