"use client";
import { useQuery } from "@tanstack/react-query";
import type { KeywordRanking, SeoRankingsResponse } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

const MOCK_KEYWORDS = [
  "best office chair for back pain",
  "ergonomic desk setup",
  "standing desk converter",
  "office chair lumbar support",
  "home office ideas",
  "monitor arm mount",
  "mechanical keyboard for work",
  "desk cable management",
];

// Mirrors the API's seed generator so mock mode reads like live data.
function mockRankings(): SeoRankingsResponse {
  const base = new Date("2026-06-18T00:00:00Z");
  const keywords: KeywordRanking[] = MOCK_KEYWORDS.map((keyword, i) => {
    const series = Array.from({ length: 30 }, (_, day) => {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + day);
      const position = Math.max(
        1,
        Math.round(6 + i * 2.5 - day * 0.12 + Math.sin(day / 4 + i) * 1.5)
      );
      return { date: d.toISOString().slice(0, 10), position };
    });
    const latest = series[series.length - 1]!.position;
    const prev = series[series.length - 8]!.position;
    const best = series.reduce((m, p) => Math.min(m, p.position), Infinity);
    return { keyword, position: latest, previousPosition: prev, change: prev - latest, best, series };
  }).sort((a, b) => a.position - b.position);

  const tracked = keywords.length;
  const avgPosition =
    Math.round((keywords.reduce((s, k) => s + k.position, 0) / tracked) * 10) / 10;
  return {
    keywords,
    summary: {
      tracked,
      avgPosition,
      topThree: keywords.filter((k) => k.position <= 3).length,
      improved: keywords.filter((k) => k.change > 0).length,
    },
  };
}

export function useKeywordRankings(workspaceId: string | null | undefined) {
  return useQuery<{ data: SeoRankingsResponse; source: "live" | "mock" }>({
    queryKey: ["seo-rankings", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<SeoRankingsResponse>(`/workspaces/${workspaceId}/seo/rankings`),
        mockRankings
      ),
  });
}
