"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { scoreKeywords, KeywordInput, ScoredKeyword } from "@/lib/logic/seo-scoring";
import { rawKeywords } from "@/lib/mock-data/seo";

/**
 * Tries the real seo-service first (POST /api/keywords/research).
 * If the backend isn't running, falls back to scoring the mock data
 * locally with the same algorithm — so the UI never breaks, it just
 * tells you which source it's using.
 */
export function useKeywordResearch(keywords: KeywordInput[] = rawKeywords) {
  return useQuery<{ data: ScoredKeyword[]; source: "live" | "mock" }>({
    queryKey: ["keyword-research", keywords],
    queryFn: async () => {
      try {
        const data = await api.post<ScoredKeyword[]>("/api/keywords/research", keywords);
        return { data, source: "live" as const };
      } catch {
        return { data: scoreKeywords(keywords), source: "mock" as const };
      }
    },
  });
}
