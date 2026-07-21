"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";
import { calculateBlendedMER, type MERResult } from "@growthos/logic";
import { merInput, kpiMock, channelMetricMock } from "@/lib/mock-data/growth-hub";
import type { ChannelKey } from "@/components/dashboard/channels";

export interface GrowthHubData {
  mer: MERResult;
  kpis: { label: string; value: string; deltaPct: number }[];
  channelMetric: Record<ChannelKey, string>;
}

function mockGrowthHub(): GrowthHubData {
  return {
    mer: calculateBlendedMER(merInput),
    kpis: kpiMock,
    channelMetric: channelMetricMock,
  };
}

/**
 * Growth Hub headline metrics. Tries the (not-yet-built) analytics endpoint and
 * falls back to computing Blended MER locally via the tested engine over mock data.
 * The endpoint arrives in M2; only this hook changes when it does.
 */
export function useGrowthHub(workspaceId: string | null | undefined) {
  return useQuery<{ data: GrowthHubData; source: "live" | "mock" }>({
    queryKey: ["growth-hub", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () =>
          api.get<GrowthHubData>(`/workspaces/${workspaceId}/analytics/growth-hub`),
        mockGrowthHub
      ),
  });
}
