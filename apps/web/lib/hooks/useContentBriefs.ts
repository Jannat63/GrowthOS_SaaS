"use client";
import { useQuery } from "@tanstack/react-query";
import type { ContentBriefRecord } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

export function useContentBriefs(workspaceId: string | null | undefined) {
  return useQuery<{ data: ContentBriefRecord[]; source: "live" | "mock" }>({
    queryKey: ["content-briefs", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: ContentBriefRecord[]; total: number }>(
              `/workspaces/${workspaceId}/content-briefs`
            )
          ).data,
        () => []
      ),
  });
}
