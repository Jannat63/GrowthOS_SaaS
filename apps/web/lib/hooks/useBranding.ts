"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WhiteLabelConfig } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

// Workspace white-label branding. Mock fallback is the default (empty) brand, so the app
// renders as GrowthOS when the API is unreachable.
export function useBranding(workspaceId: string | null | undefined) {
  return useQuery<{ data: WhiteLabelConfig; source: "live" | "mock" }>({
    queryKey: ["branding", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ config: WhiteLabelConfig }>(`/workspaces/${workspaceId}/branding`)
          ).config,
        () => ({}) as WhiteLabelConfig
      ),
  });
}

export function useBrandingActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: WhiteLabelConfig) =>
      api.patch(`/workspaces/${workspaceId}/branding`, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branding", workspaceId] });
    },
  });
}
