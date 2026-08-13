"use client";
import { useQuery } from "@tanstack/react-query";
import type { InternalLinkRecommendationsResponse } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

// A representative sample matching the shape of what the API's "striking distance" heuristic
// (position 4-15 + token overlap) would produce over the same seeded rankings/pages used
// elsewhere in the SEO module's mocks.
function mockInternalLinks(): InternalLinkRecommendationsResponse {
  const recommendations: InternalLinkRecommendationsResponse["recommendations"] = [
    {
      targetPage: "/products/standing-desk-converter",
      sourcePage: "/blog/best-office-chair-for-back-pain",
      keyword: "standing desk converter",
      anchorText: "standing desk converter",
      currentPosition: 6,
      priority: "high",
      reason:
        '"standing desk converter" ranks #6 — within striking distance of page 1\'s top results. A contextual link from your highest-traffic page can help close the gap.',
    },
    {
      targetPage: "/products/monitor-arm",
      sourcePage: "/blog/best-office-chair-for-back-pain",
      keyword: "monitor arm mount",
      anchorText: "monitor arm mount",
      currentPosition: 9,
      priority: "medium",
      reason:
        '"monitor arm mount" ranks #9 — within striking distance of page 1\'s top results. A contextual link from your highest-traffic page can help close the gap.',
    },
    {
      targetPage: "/collections/keyboards",
      sourcePage: "/blog/best-office-chair-for-back-pain",
      keyword: "mechanical keyboard for work",
      anchorText: "mechanical keyboard for work",
      currentPosition: 13,
      priority: "low",
      reason:
        '"mechanical keyboard for work" ranks #13 — within striking distance of page 1\'s top results. A contextual link from your highest-traffic page can help close the gap.',
    },
  ];
  return {
    recommendations,
    summary: {
      opportunities: recommendations.length,
      highPriority: recommendations.filter((r) => r.priority === "high").length,
    },
  };
}

export function useInternalLinks(workspaceId: string | null | undefined) {
  return useQuery<{ data: InternalLinkRecommendationsResponse; source: "live" | "mock" }>({
    queryKey: ["seo-internal-links", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<InternalLinkRecommendationsResponse>(`/workspaces/${workspaceId}/seo/internal-links`),
        mockInternalLinks
      ),
  });
}
