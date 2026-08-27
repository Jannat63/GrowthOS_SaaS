"use client";
import { useQuery } from "@tanstack/react-query";
import type { MerDashboard, MerTrendPoint } from "@growthos/types";
import { calculateBlendedMER } from "@growthos/logic";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";
import { rangeKey, rangeQuery } from "./rangeQuery";
import { rangeLength, type DateRange } from "@/lib/stores/range";

// Deterministic mock trend (no ClickHouse fixture on the client) — mirrors the API's blended calc.
function mockMer(days: number): MerDashboard {
  const trend: MerTrendPoint[] = [];
  let google = 0;
  let meta = 0;
  let rev = 0;
  const start = new Date("2026-06-18T00:00:00Z");
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const googleSpend = 45.5;
    const metaSpend = 90.25;
    const revenue = Math.round((320 + 210) * 2.2);
    google += googleSpend;
    meta += metaSpend;
    rev += revenue;
    const mer = calculateBlendedMER({ totalRevenue: revenue, googleAdsSpend: googleSpend, metaAdsSpend: metaSpend }).blendedMER;
    trend.push({ date: d.toISOString().slice(0, 10), mer, spend: Math.round((googleSpend + metaSpend) * 100) / 100, revenue });
  }
  return {
    trend,
    summary: calculateBlendedMER({ totalRevenue: rev, googleAdsSpend: google, metaAdsSpend: meta }),
    channelBreakdown: { googleAdsSpend: Math.round(google * 100) / 100, metaAdsSpend: Math.round(meta * 100) / 100 },
    anomaly: { detected: false, changePercent: 0 },
  };
}

export function useMer(workspaceId: string | null | undefined, range: DateRange | null) {
  // The mock has no server to resolve a default against, so it mirrors the request's own length.
  const days = range ? rangeLength(range) : 30;
  return useQuery<{ data: MerDashboard; source: "live" | "mock" }>({
    queryKey: ["mer", workspaceId, rangeKey(range)],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () =>
          api.get<MerDashboard>(
            `/workspaces/${workspaceId}/analytics/mer${rangeQuery(range)}`
          ),
        () => mockMer(days)
      ),
  });
}
