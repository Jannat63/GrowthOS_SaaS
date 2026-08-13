"use client";
import { useQuery } from "@tanstack/react-query";
import type { GrowthHubResponse } from "@growthos/types";
import { calculateBlendedMER, type MERResult } from "@growthos/logic";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";
import { growthHubMock } from "@/lib/mock-data/growth-hub";
import type { ChannelKey } from "@/components/dashboard/channels";

export interface GrowthHubKpi {
  key: "revenue" | "adSpend" | "organicClicks" | "conversions";
  label: string;
  value: string;
  /** null when the previous window was zero — a percentage change from nothing is undefined, not 0%. */
  deltaPct: number | null;
}

export interface GrowthHubData {
  windowDays: number;
  kpis: GrowthHubKpi[];
  mer: MERResult;
  channelMetric: Record<ChannelKey, string>;
  baseline: GrowthHubResponse["baseline"];
}

const currency = (n: number) => `$${Math.round(n).toLocaleString()}`;
const count = (n: number) => Math.round(n).toLocaleString();
/** 128,400 -> "128K". Keeps big organic numbers from dominating a stat tile. */
const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000
      ? `${Math.round(n / 1000)}K`
      : count(n);

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Shapes the API's raw numbers into what the page renders. All presentation — formatting, delta
 * math, the blended-MER engine call — lives here rather than in the API, so the endpoint stays a
 * pure aggregate and the same code path runs whether the data came from the server or the fallback.
 */
export function toGrowthHubData(res: GrowthHubResponse): GrowthHubData {
  const { metrics, channels } = res;
  const adSpendCur = metrics.googleSpend.current + metrics.metaSpend.current;
  const adSpendPrev = metrics.googleSpend.previous + metrics.metaSpend.previous;

  return {
    windowDays: res.windowDays,
    kpis: [
      {
        key: "revenue",
        label: "Revenue",
        value: currency(metrics.revenue.current),
        deltaPct: deltaPct(metrics.revenue.current, metrics.revenue.previous),
      },
      {
        key: "adSpend",
        label: "Ad spend",
        value: currency(adSpendCur),
        deltaPct: deltaPct(adSpendCur, adSpendPrev),
      },
      {
        key: "organicClicks",
        label: "Organic clicks",
        value: compact(metrics.organicClicks.current),
        deltaPct: deltaPct(metrics.organicClicks.current, metrics.organicClicks.previous),
      },
      {
        key: "conversions",
        label: "Conversions",
        value: count(metrics.conversions.current),
        deltaPct: deltaPct(metrics.conversions.current, metrics.conversions.previous),
      },
    ],
    mer: calculateBlendedMER({
      totalRevenue: metrics.revenue.current,
      googleAdsSpend: metrics.googleSpend.current,
      metaAdsSpend: metrics.metaSpend.current,
    }),
    channelMetric: {
      seo: `${compact(channels.seo.organicClicks)} organic clicks`,
      google: `${count(channels.google.conversions)} conversions`,
      meta: `${count(channels.meta.conversions)} conversions`,
    },
    baseline: res.baseline,
  };
}

/** Growth Hub headline metrics + the Goal Simulator's baseline, in one call. */
export function useGrowthHub(workspaceId: string | null | undefined, days = 30) {
  return useQuery<{ data: GrowthHubData; source: "live" | "mock" }>({
    queryKey: ["growth-hub", workspaceId, days],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          toGrowthHubData(
            await api.get<GrowthHubResponse>(
              `/workspaces/${workspaceId}/analytics/growth-hub?days=${days}`
            )
          ),
        () => toGrowthHubData(growthHubMock)
      ),
  });
}
