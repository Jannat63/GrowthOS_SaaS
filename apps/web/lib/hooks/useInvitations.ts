"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AcceptInvitationResponse,
  InvitationPreview,
  Role,
  WorkspaceInvitation,
} from "@growthos/types";
import { api } from "@/lib/api/client";

// No live/mock fallback here, same reasoning as useApiKeys — inviting or revoking someone's
// access to a workspace is a real security action, not something to silently fake offline.
export function useInvitations(workspaceId: string | null | undefined) {
  return useQuery<{ data: WorkspaceInvitation[]; total: number }>({
    queryKey: ["invitations", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      api.get<{ data: WorkspaceInvitation[]; total: number }>(
        `/workspaces/${workspaceId}/invitations`
      ),
  });
}

export function useCreateInvitation(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: Role }) =>
      api.post<WorkspaceInvitation>(`/workspaces/${workspaceId}/invitations`, { email, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", workspaceId] }),
  });
}

export function useRevokeInvitation(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.del(`/workspaces/${workspaceId}/invitations/${invitationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", workspaceId] }),
  });
}

/** Unauthenticated preview for the accept-invite page — no session required to load this. */
export function useInvitationPreview(invitationId: string | null | undefined) {
  return useQuery<InvitationPreview>({
    queryKey: ["invitation-preview", invitationId],
    enabled: Boolean(invitationId),
    retry: false, // a bad/expired id is a real 404, not a transient failure worth retrying
    queryFn: () => api.get<InvitationPreview>(`/invitations/${invitationId}`),
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post<AcceptInvitationResponse>(`/invitations/${invitationId}/accept`, {}),
    // The new membership changes what /auth/me returns (another workspace in the list), which
    // drives the sidebar's workspace switcher — stale here would hide the workspace just joined.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}
