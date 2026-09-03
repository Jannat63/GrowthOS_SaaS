"use client";
import { useQuery } from "@tanstack/react-query";
import type { ScoredCreative } from "@growthos/types";
import { detectFatigueAll } from "@growthos/logic";
import { creatives } from "@growthos/logic/fixtures";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

function mockFatigue(): ScoredCreative[] {
  return detectFatigueAll(creatives).map((f) => ({
    name: f.name,
    frequency: f.frequency,
    ctrThisWeek: f.ctrThisWeek,
    ctrLastWeek: f.ctrLastWeek,
    ctrDeclinePercent: f.ctrDeclinePercent,
    hoursSinceLaunch: f.hoursSinceLaunch,
    status: f.status,
    message: f.message,
  }));
}

export function useFatigue(workspaceId: string | null | undefined) {
  return useQuery<{ data: ScoredCreative[]; source: "live" | "mock" }>({
    queryKey: ["fatigue", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: ScoredCreative[]; total: number }>(
              `/workspaces/${workspaceId}/meta-ads/fatigue`
            )
          ).data,
        mockFatigue
      ),
  });
}
