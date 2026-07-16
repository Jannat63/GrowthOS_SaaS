"use client";
import { useQuery } from "@tanstack/react-query";
import type { JobStatusResponse } from "@growthos/types";
import { api } from "@/lib/api/client";

/**
 * Poll an async job's status until it reaches a terminal state. Used by the
 * onboarding "analyzing" screen to watch the onboarding_analyze job (P2.2).
 */
export function useJob(workspaceId: string | null, jobId: string | null) {
  return useQuery<JobStatusResponse>({
    queryKey: ["job", workspaceId, jobId],
    enabled: Boolean(workspaceId && jobId),
    queryFn: () => api.get<JobStatusResponse>(`/workspaces/${workspaceId}/jobs/${jobId}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "complete" || status === "failed" ? false : 1000;
    },
  });
}
