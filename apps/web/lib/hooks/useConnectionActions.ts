"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

// Connect (redirect to provider consent), disconnect, and manual sync for platform connections (M3 P3.0).
export function useConnectionActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["connections", workspaceId] });

  async function connect(platform: string) {
    const { url } = await api.get<{ url: string }>(
      `/workspaces/${workspaceId}/connections/${platform}/connect`
    );
    window.location.href = url; // provider consent screen
  }

  const disconnect = useMutation({
    mutationFn: (connectionId: string) =>
      api.del(`/workspaces/${workspaceId}/connections/${connectionId}`),
    onSuccess: invalidate,
  });

  const sync = useMutation({
    mutationFn: (connectionId: string) =>
      api.post(`/workspaces/${workspaceId}/connections/${connectionId}/sync`, {}),
    onSuccess: invalidate,
  });

  return { connect, disconnect, sync };
}
