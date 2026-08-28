"use client";
import { useQuery } from "@tanstack/react-query";
import type { MerDashboard } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";
import { rangeKey, rangeQuery } from "./rangeQuery";
import { rangeLength, type DateRange } from "@/lib/stores/range";
import { merMock } from "@/lib/mock-data/mer";

export function useMer(workspaceId: string | null | undefined, range: DateRange | null) {
  // The mock has no server to resolve a default against, so it mirrors the request's own length.
  const days = range ? rangeLength(range) : 30;
  return useQuery<{ data: MerDashboard; source: "live" | "mock" }>({
    queryKey: ["mer", workspaceId, rangeKey(range)],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () =>
          api.get<MerDashboard>(
            `/workspaces/${workspaceId}/analytics/mer${rangeQuery(range)}`
          ),
        () => merMock(range, days)
      ),
  });
}
