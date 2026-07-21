"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { generateCrossChannelRecommendations, CrossChannelRecommendation } from "@/lib/logic/cross-channel-engine";
import { scoreKeywords } from "@/lib/logic/seo-scoring";
import { rawKeywords } from "@/lib/mock-data/seo";
import { analyzeSearchTerms } from "@/lib/logic/search-terms-bridge";
import { searchTerms } from "@/lib/mock-data/google-ads";
import { detectFatigueAll } from "@/lib/logic/creative-fatigue";
import { creatives } from "@/lib/mock-data/meta-ads";

/**
 * The core differentiator, wired live. workspace_id is derived server-side
 * from the caller's JWT (see auth-service / intelligence-service) — the
 * client just needs to be signed in, it doesn't send a workspace_id itself.
 * Falls back to running the same engine locally against mock data if the
 * backend isn't reachable or the user isn't signed in yet.
 */
export function useCrossChannelRecommendations() {
  const keywords = scoreKeywords(rawKeywords);
  const terms = analyzeSearchTerms(searchTerms);
  const fatigue = detectFatigueAll(creatives);

  return useQuery<{ data: CrossChannelRecommendation[]; source: "live" | "mock" }>({
    queryKey: ["cross-channel-recommendations"],
    queryFn: async () => {
      try {
        const data = await api.post<CrossChannelRecommendation[]>("/api/intelligence/recommendations", {
          keywords: keywords.map((k) => ({ keyword: k.keyword, volume: k.volume, current_position: k.currentPosition, opportunity_score: k.opportunityScore })),
          search_terms: terms.map((t) => ({ term: t.term, conversions: t.conversions, recommendation_type: t.recommendation.type, message: t.recommendation.message })),
          fatigue_results: fatigue.map((f) => ({ name: f.name, ctr_this_week: f.ctrThisWeek })),
        });
        return { data, source: "live" as const };
      } catch {
        return { data: generateCrossChannelRecommendations(keywords, terms, fatigue), source: "mock" as const };
      }
    },
  });
}
