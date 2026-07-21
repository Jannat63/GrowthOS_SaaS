"use client";
import { useQuery } from "@tanstack/react-query";
import type { PlatformConnection } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/** LIVE: platform connections for a workspace from `/api/v1/workspaces/:id/connections`. */
export function useConnections(workspaceId: string | null | undefined) {
  return useQuery<{ data: PlatformConnection[]; source: "live" | "mock" }>({
    queryKey: ["connections", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: PlatformConnection[]; total: number }>(
              `/workspaces/${workspaceId}/connections`
            )
          ).data,
        // A fresh workspace legitimately has no connections; mock mirrors that.
        () => [] as PlatformConnection[]
      ),
  });
}
