"use client";
import { useQuery } from "@tanstack/react-query";
import {
  attributeAll,
  type AttributionModel,
  type ChannelCredit,
  type ConversionPath,
} from "@growthos/logic";
import { conversionPaths } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

export interface AttributionResponse {
  models: Record<AttributionModel, ChannelCredit[]>;
  channels: string[];
  /** The paths the credit was divided over — the page shows the working, not just the totals. */
  paths: ConversionPath[];
}

// Mock runs the SAME attribution engine over the shared conversion-path fixture, so live and
// fallback agree in shape and values. The API seeds ClickHouse from this same fixture, so `paths`
// matches too — order aside, which the renderer normalizes rather than relying on either source.
function mockAttribution(): AttributionResponse {
  const models = attributeAll(conversionPaths);
  const channels = [...new Set(models.linear.map((c) => c.channel))].sort();
  return { models, channels, paths: conversionPaths };
}

export function useAttribution(workspaceId: string | null | undefined) {
  return useQuery<{ data: AttributionResponse; source: "live" | "mock" }>({
    queryKey: ["attribution", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () => api.get<AttributionResponse>(`/workspaces/${workspaceId}/analytics/attribution`),
        mockAttribution
      ),
  });
}
