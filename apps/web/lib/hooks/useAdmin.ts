"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  AdminAuditLogEntry,
  AdminUserSummary,
  AdminWorkspaceDetail,
  AdminWorkspaceSummary,
  Plan,
  PlatformOverview,
  PlatformRole,
  MeResponse,
} from "@growthos/types";
import { api, ApiError } from "@/lib/api/client";

/**
 * Every admin read writes a row to the platform audit log (apps/api/src/routes/admin.ts), so an
 * unthrottled refetch is not just wasted bandwidth — it is a line in a permanent record of who
 * looked at what. With no staleTime, TanStack Query refetched on every window focus, and idly
 * alt-tabbing back to the console produced a screen of identical "Browsed people" entries.
 *
 * A minute is long enough that returning to a tab is free and short enough that a plan override
 * applied in another tab shows up when you look. The server-side repeat collapsing in
 * `logAdminAction` covers the rest.
 */
const ADMIN_STALE_MS = 60_000;

/**
 * Whether the signed-in user has ANY platform admin role, and which. Used by the (admin) route
 * group's layout to decide whether to render at all. This is a UX gate only — every actual admin
 * API call re-checks server-side (see apps/api/src/routes/admin.ts), so there's no path where a
 * non-admin can reach real data just by getting past this hook.
 */
export function useAdminAccess() {
  return useQuery<{ platformRole: PlatformRole } | null>({
    queryKey: ["admin", "me"],
    staleTime: ADMIN_STALE_MS,
    retry: false,
    queryFn: async () => {
      try {
        return await api.get<{ platformRole: PlatformRole }>("/admin/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return null;
        throw err;
      }
    },
  });
}

/**
 * The signed-in operator's own account, read straight from `/auth/me`.
 *
 * Deliberately not `useWorkspace`: that hook runs through `liveOrMock`, which invents a "Demo
 * Workspace" whenever the API is unreachable. Harmless in the customer app, actively misleading
 * here — the one question this answers is whether the operator has a real workspace to return to,
 * and platform staff normally have none. A fabricated one would put a door in the wall that leads
 * nowhere, which is the bug this replaces.
 */
export function useOperatorIdentity() {
  return useQuery<MeResponse>({
    queryKey: ["admin", "operator"],
    staleTime: ADMIN_STALE_MS,
    queryFn: () => api.get<MeResponse>("/auth/me"),
  });
}

export function useAdminWorkspaces(search: string, options?: { enabled?: boolean }) {
  return useQuery<{ data: AdminWorkspaceSummary[]; total: number }>({
    queryKey: ["admin", "workspaces", search],
    staleTime: ADMIN_STALE_MS,
    enabled: options?.enabled ?? true,
    queryFn: () =>
      api.get<{ data: AdminWorkspaceSummary[]; total: number }>(
        `/admin/workspaces${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}

export function useAdminWorkspaceDetail(workspaceId: string | null) {
  return useQuery<AdminWorkspaceDetail>({
    queryKey: ["admin", "workspace", workspaceId],
    staleTime: ADMIN_STALE_MS,
    enabled: Boolean(workspaceId),
    queryFn: () => api.get<AdminWorkspaceDetail>(`/admin/workspaces/${workspaceId}`),
  });
}

export function usePlanOverride(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { plan: Plan; reason: string }) =>
      api.post<{ success: boolean }>(`/admin/workspaces/${workspaceId}/plan-override`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
      toast.success(`Plan overridden to ${variables.plan}.`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't apply the plan override — try again.");
    },
  });
}

export function useAdminUsers(search: string, options?: { enabled?: boolean }) {
  return useQuery<{ data: AdminUserSummary[]; total: number }>({
    queryKey: ["admin", "users", search],
    staleTime: ADMIN_STALE_MS,
    enabled: options?.enabled ?? true,
    queryFn: () =>
      api.get<{ data: AdminUserSummary[]; total: number }>(
        `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}

export function useAdminOverview() {
  return useQuery<PlatformOverview>({
    queryKey: ["admin", "overview"],
    staleTime: ADMIN_STALE_MS,
    queryFn: () => api.get<PlatformOverview>("/admin/overview"),
  });
}

export function useAdminAuditLog() {
  return useQuery<{ data: AdminAuditLogEntry[]; total: number }>({
    queryKey: ["admin", "audit-log"],
    staleTime: ADMIN_STALE_MS,
    queryFn: () => api.get<{ data: AdminAuditLogEntry[]; total: number }>("/admin/audit-log"),
  });
}
