"use client";
import { useQuery } from "@tanstack/react-query";
import {
  attributeAll,
  type AttributionModel,
  type ChannelCredit,
} from "@growthos/logic";
import { conversionPaths } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

export interface AttributionResponse {
  models: Record<AttributionModel, ChannelCredit[]>;
  channels: string[];
}

// Mock runs the SAME attribution engine over the shared conversion-path fixture, so live and
// fallback agree in shape and values.
function mockAttribution(): AttributionResponse {
  const models = attributeAll(conversionPaths);
  const channels = [...new Set(models.linear.map((c) => c.channel))].sort();
  return { models, channels };
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
