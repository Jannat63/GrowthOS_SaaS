"use client";
import { useQuery } from "@tanstack/react-query";
import type {
  OrganicPage,
  OrganicTrafficPoint,
  OrganicTrafficResponse,
} from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

const MOCK_PAGES = [
  "/blog/best-office-chair-for-back-pain",
  "/products/ergonomic-desk",
  "/blog/home-office-setup-guide",
  "/products/standing-desk-converter",
  "/blog/lumbar-support-explained",
  "/products/monitor-arm",
  "/blog/cable-management-tips",
  "/collections/keyboards",
];

// Mirrors the API's seed + aggregation so mock mode reads like live data.
function mockTraffic(): OrganicTrafficResponse {
  const base = new Date("2026-06-18T00:00:00Z");
  const trendMap = new Map<string, { clicks: number; impressions: number }>();
  const pages: OrganicPage[] = MOCK_PAGES.map((page, i) => {
    let clicks = 0;
    let impressions = 0;
    let positionSum = 0;
    for (let day = 0; day < 30; day++) {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + day);
      const date = d.toISOString().slice(0, 10);
      const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
      const demand = (1 + Math.sin(day / 3 + i) * 0.2 + day * 0.01) * (weekend ? 0.8 : 1);
      const imp = Math.round((900 - i * 80) * demand);
      const ctr = 0.03 + (MOCK_PAGES.length - i) * 0.004;
      const clk = Math.max(0, Math.round(imp * ctr));
      clicks += clk;
      impressions += imp;
      positionSum += Math.max(1, 5 + i * 1.5 - day * 0.08);
      const agg = trendMap.get(date) ?? { clicks: 0, impressions: 0 };
      agg.clicks += clk;
      agg.impressions += imp;
      trendMap.set(date, agg);
    }
    return {
      pageUrl: page,
      clicks,
      impressions,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      avgPosition: Math.round((positionSum / 30) * 10) / 10,
    };
  }).sort((a, b) => b.clicks - a.clicks);

  const trend: OrganicTrafficPoint[] = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, clicks: v.clicks, impressions: v.impressions }));

  const totalClicks = pages.reduce((s, p) => s + p.clicks, 0);
  const totalImpressions = pages.reduce((s, p) => s + p.impressions, 0);
  return {
    pages,
    trend,
    summary: {
      pages: pages.length,
      totalClicks,
      totalImpressions,
      avgCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0,
      avgPosition:
        pages.length
          ? Math.round((pages.reduce((s, p) => s + p.avgPosition, 0) / pages.length) * 10) / 10
          : 0,
    },
  };
}

export function useOrganicTraffic(workspaceId: string | null | undefined) {
  return useQuery<{ data: OrganicTrafficResponse; source: "live" | "mock" }>({
    queryKey: ["seo-traffic", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<OrganicTrafficResponse>(`/workspaces/${workspaceId}/seo/traffic`),
        mockTraffic
      ),
  });
}
