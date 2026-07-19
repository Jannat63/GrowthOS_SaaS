"use client";
import { useQuery } from "@tanstack/react-query";
import type { WorkspaceMember } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

export function useMembers(workspaceId: string | null | undefined) {
  return useQuery<{ data: WorkspaceMember[]; source: "live" | "mock" }>({
    queryKey: ["members", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: WorkspaceMember[]; total: number }>(
              `/workspaces/${workspaceId}/members`
            )
          ).data,
        () => [{ userId: "mock", name: "You", email: "you@growthos.dev", role: "owner" as const }]
      ),
  });
}
