"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContentBriefRecord, ContentBriefStatus } from "@growthos/types";
import {
  analyzeSearchTerms,
  generateContentBrief,
  generateCreativeBrief,
  scoreKeywords,
} from "@growthos/logic";
import { rawKeywords, searchTerms } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/**
 * The offline briefs.
 *
 * This returned `[]`, which meant that with the API unreachable both the Content Pipeline and the
 * Creative Queue rendered opportunity cards with no brief attached — each page's entire
 * deliverable gone, looking like a bug rather than a fallback. The same fixtures the API seeds
 * from are run through the same two generators here.
 *
 * One table, two shapes: a ContentBrief per paid->organic term and a CreativeBrief per
 * organic->paid keyword, exactly as apps/api/src/{search-terms,organic-to-paid}.ts write them.
 *
 * `recommendationId` mirrors the offline queue's id scheme (`p2o:<term>` / `o2p:<keyword>` — see
 * useRecommendations.buildOfflineQueue), so a brief still finds its recommendation offline. The
 * `id` namespaces are kept apart because one string can be both a paid search term and an organic
 * keyword, and a collision would hand two rows the same React key.
 */
function mockBriefs(workspaceId: string): ContentBriefRecord[] {
  const contentBriefs: ContentBriefRecord[] = analyzeSearchTerms(searchTerms)
    .filter((t) => t.recommendation.type === "paid-proven-organic-needed")
    .map((t) => ({
      id: `brief:p2o:${t.term}`,
      workspaceId,
      recommendationId: `p2o:${t.term}`,
      keyword: t.term,
      status: "draft" as ContentBriefStatus,
      brief: generateContentBrief(t.term),
      source: "google_ads_search_term",
      publishedUrl: null,
      createdAt: null,
    }));

  // The other half of the table. `content_briefs` holds a CreativeBrief for every organic->paid
  // recommendation too (apps/api/src/organic-to-paid.ts), and omitting them meant the Creative
  // Queue rendered opportunity cards with no brief attached whenever the API was unreachable —
  // the page's entire deliverable missing, looking like a bug rather than a fallback.
  const creativeBriefs: ContentBriefRecord[] = scoreKeywords(rawKeywords)
    .filter((k) => k.currentPosition !== null && k.currentPosition <= 10 && k.volume >= 5000)
    .map((k) => ({
      id: `brief:o2p:${k.keyword}`,
      workspaceId,
      recommendationId: `o2p:${k.keyword}`,
      keyword: k.keyword,
      status: "draft" as ContentBriefStatus,
      brief: generateCreativeBrief(k),
      source: "organic_top_page",
      publishedUrl: null,
      createdAt: null,
    }));

  return [...contentBriefs, ...creativeBriefs];
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
