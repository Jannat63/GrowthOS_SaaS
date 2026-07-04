"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { analyzeSearchTerms, SearchTerm, AnalyzedSearchTerm } from "@/lib/logic/search-terms-bridge";
import { searchTerms as mockTerms } from "@/lib/mock-data/google-ads";

export function useSearchTerms(terms: SearchTerm[] = mockTerms) {
  return useQuery<{ data: AnalyzedSearchTerm[]; source: "live" | "mock" }>({
    queryKey: ["search-terms", terms],
    queryFn: async () => {
      try {
        const data = await api.post<AnalyzedSearchTerm[]>("/api/google-ads/search-terms", terms);
        return { data, source: "live" as const };
      } catch {
        return { data: analyzeSearchTerms(terms), source: "mock" as const };
      }
    },
  });
}
