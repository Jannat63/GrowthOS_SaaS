"use client";
import { useQuery } from "@tanstack/react-query";
import type { AuditLogEntry } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

// Recent workspace activity. Mock fallback is an empty log (no fixture engine — audit is
// live-only data), so the section renders an empty state rather than fabricated history.
export function useAuditLogs(workspaceId: string | null | undefined, limit = 20) {
  return useQuery<{ data: { data: AuditLogEntry[]; total: number }; source: "live" | "mock" }>({
    queryKey: ["audit-logs", workspaceId, limit],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        () =>
          api.get<{ data: AuditLogEntry[]; total: number }>(
            `/workspaces/${workspaceId}/audit-logs?limit=${limit}`
          ),
        () => ({ data: [] as AuditLogEntry[], total: 0 })
      ),
  });
}
