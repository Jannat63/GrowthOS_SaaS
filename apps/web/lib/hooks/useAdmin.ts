"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminAuditLogEntry,
  AdminUserSummary,
  AdminWorkspaceDetail,
  AdminWorkspaceSummary,
  Plan,
  PlatformHealth,
  PlatformRole,
} from "@growthos/types";
import { api, ApiError } from "@/lib/api/client";

/**
 * Whether the signed-in user has ANY platform admin role, and which. Used by the (admin) route
 * group's layout to decide whether to render at all. This is a UX gate only — every actual admin
 * API call re-checks server-side (see apps/api/src/routes/admin.ts), so there's no path where a
 * non-admin can reach real data just by getting past this hook.
 */
export function useAdminAccess() {
  return useQuery<{ platformRole: PlatformRole } | null>({
    queryKey: ["admin", "me"],
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

export function useAdminWorkspaces(search: string) {
  return useQuery<{ data: AdminWorkspaceSummary[]; total: number }>({
    queryKey: ["admin", "workspaces", search],
    queryFn: () =>
      api.get<{ data: AdminWorkspaceSummary[]; total: number }>(
        `/admin/workspaces${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}

export function useAdminWorkspaceDetail(workspaceId: string | null) {
  return useQuery<AdminWorkspaceDetail>({
    queryKey: ["admin", "workspace", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => api.get<AdminWorkspaceDetail>(`/admin/workspaces/${workspaceId}`),
  });
}

export function usePlanOverride(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { plan: Plan; reason: string }) =>
      api.post<{ success: boolean }>(`/admin/workspaces/${workspaceId}/plan-override`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
    },
  });
}

export function useAdminUsers(search: string) {
  return useQuery<{ data: AdminUserSummary[]; total: number }>({
    queryKey: ["admin", "users", search],
    queryFn: () =>
      api.get<{ data: AdminUserSummary[]; total: number }>(
        `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });
}

export function useAdminHealth() {
  return useQuery<PlatformHealth>({
    queryKey: ["admin", "health"],
    queryFn: () => api.get<PlatformHealth>("/admin/health"),
  });
}

export function useAdminAuditLog() {
  return useQuery<{ data: AdminAuditLogEntry[]; total: number }>({
    queryKey: ["admin", "audit-log"],
    queryFn: () => api.get<{ data: AdminAuditLogEntry[]; total: number }>("/admin/audit-log"),
  });
}
