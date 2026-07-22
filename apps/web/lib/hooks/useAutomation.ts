"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AutomationConfig, SchedulerRun } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

const DEFAULT_AUTOMATION: AutomationConfig = { enabled: true, cadenceMs: 7 * 24 * 60 * 60 * 1000 };

// Autonomous-loop config for a workspace. Mock fallback is the default (enabled, weekly).
export function useAutomation(workspaceId: string | null | undefined) {
  return useQuery<{ data: AutomationConfig; source: "live" | "mock" }>({
    queryKey: ["automation", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (await api.get<{ config: AutomationConfig }>(`/workspaces/${workspaceId}/automation`)).config,
        () => DEFAULT_AUTOMATION
      ),
  });
}

export function useAutomationActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AutomationConfig>) =>
      api.patch(`/workspaces/${workspaceId}/automation`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation", workspaceId] });
    },
  });
}

// Observability: recent scheduler ticks. Mock fallback is an empty list.
export function useSchedulerRuns(workspaceId: string | null | undefined, limit = 10) {
  return useQuery<{ data: SchedulerRun[]; source: "live" | "mock" }>({
    queryKey: ["scheduler-runs", workspaceId, limit],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ runs: SchedulerRun[] }>(
              `/workspaces/${workspaceId}/scheduler/runs?limit=${limit}`
            )
          ).runs,
        () => [] as SchedulerRun[]
      ),
  });
}
