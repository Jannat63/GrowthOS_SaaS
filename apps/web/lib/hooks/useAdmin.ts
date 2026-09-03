"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  AdminAuditLogEntry,
  AdminUserDetail,
  AdminUserFilter,
  AdminUserSort,
  AdminUserSummary,
  AdminWorkspaceDetail,
  AdminWorkspaceFilter,
  AdminWorkspaceSort,
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

/** How many rows a directory page holds. Also the page size the API defaults to. */
export const DIRECTORY_PAGE_SIZE = 50;

/**
 * Filtering, sorting and paging all happen server-side, so they all belong in the query string —
 * and in the query key, or two different filters would share one cache entry and show each other's
 * rows. Absent values are omitted rather than sent empty, which keeps the URL (and the audit-log
 * metadata that records the search) readable.
 */
function directoryQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export interface DirectoryPage {
  offset?: number;
  limit?: number;
  enabled?: boolean;
}

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

export interface WorkspaceQuery extends DirectoryPage {
  search?: string;
  filter?: AdminWorkspaceFilter | undefined;
  sort?: AdminWorkspaceSort | undefined;
}

export function useAdminWorkspaces(params: WorkspaceQuery = {}) {
  const { search, filter, sort, offset = 0, limit = DIRECTORY_PAGE_SIZE, enabled = true } = params;
  const qs = directoryQuery({ search, filter, sort, limit, offset });
  return useQuery<{ data: AdminWorkspaceSummary[]; total: number }>({
    queryKey: ["admin", "workspaces", qs],
    staleTime: ADMIN_STALE_MS,
    enabled,
    queryFn: () => api.get<{ data: AdminWorkspaceSummary[]; total: number }>(`/admin/workspaces${qs}`),
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

export interface UserQuery extends DirectoryPage {
  search?: string;
  filter?: AdminUserFilter | undefined;
  sort?: AdminUserSort | undefined;
}

export function useAdminUsers(params: UserQuery = {}) {
  const { search, filter, sort, offset = 0, limit = DIRECTORY_PAGE_SIZE, enabled = true } = params;
  const qs = directoryQuery({ search, filter, sort, limit, offset });
  return useQuery<{ data: AdminUserSummary[]; total: number }>({
    queryKey: ["admin", "users", qs],
    staleTime: ADMIN_STALE_MS,
    enabled,
    queryFn: () => api.get<{ data: AdminUserSummary[]; total: number }>(`/admin/users${qs}`),
  });
}

export function useAdminUserDetail(userId: string | null) {
  return useQuery<AdminUserDetail>({
    queryKey: ["admin", "user", userId],
    staleTime: ADMIN_STALE_MS,
    enabled: Boolean(userId),
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${userId}`),
  });
}

/**
 * Grant or remove a platform role. `null` removes it.
 *
 * The server refuses to let anyone change their own row, so the only failure worth handling here
 * is the message coming back — which says why, and is worth showing verbatim rather than replacing
 * with a generic apology.
 */
export function useSetPlatformRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: PlatformRole | null; reason: string }) =>
      api.post<{ success: boolean }>(`/admin/users/${userId}/platform-role`, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(
        variables.role ? "Platform access granted." : "Platform access removed."
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't change platform access.");
    },
  });
}

export function useRevokeSessions(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string }) =>
      api.post<{ success: boolean; revoked: number }>(
        `/admin/users/${userId}/revoke-sessions`,
        input
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      toast.success(
        data.revoked === 1 ? "Signed out of 1 session." : `Signed out of ${data.revoked} sessions.`
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't sign this person out.");
    },
  });
}

export function useExtendTrial(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { days: number; reason: string }) =>
      api.post<{ success: boolean; trialEndsAt: string | null }>(
        `/admin/workspaces/${workspaceId}/extend-trial`,
        input
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(
        variables.days === 1 ? "Trial extended by a day." : `Trial extended by ${variables.days} days.`
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't extend the trial.");
    },
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
