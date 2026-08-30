"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EnqueueResponse, SiteAuditStatusResponse } from "@growthos/types";
import { api, ApiError } from "@/lib/api/client";

/**
 * The most recent site-audit job for this workspace, real HTTP crawl (apps/worker's `site_audit`
 * handler) — not seeded/fixture data. Polls while a crawl is in-flight; stops once terminal.
 * A workspace that has never run an audit gets a 404 from the API, which this treats as "no audit
 * yet" rather than an error.
 */
export function useSiteAudit(workspaceId: string | null) {
  return useQuery<SiteAuditStatusResponse | null>({
    queryKey: ["site-audit", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      try {
        return await api.get<SiteAuditStatusResponse>(`/workspaces/${workspaceId}/seo/site-audit`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "processing" ? 2000 : false;
    },
  });
}

export function useTriggerSiteAudit(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { url?: string; maxPages?: number } = {}) =>
      api.post<EnqueueResponse>(`/workspaces/${workspaceId}/seo/site-audit`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-audit", workspaceId] });
    },
  });
}
