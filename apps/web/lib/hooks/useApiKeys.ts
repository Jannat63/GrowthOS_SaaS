"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiKey extends ApiKeySummary {
  plaintext: string;
}

// No live/mock fallback here, same reasoning as useCheckout/usePortal — creating or revoking a
// credential is a real security action, not something to silently fake when the API is unreachable.
export function useApiKeys(workspaceId: string | null | undefined) {
  return useQuery<{ keys: ApiKeySummary[] }>({
    queryKey: ["api-keys", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => api.get<{ keys: ApiKeySummary[] }>(`/workspaces/${workspaceId}/api-keys`),
  });
}

export function useCreateApiKey(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<CreatedApiKey>(`/workspaces/${workspaceId}/api-keys`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys", workspaceId] }),
  });
}

export function useRevokeApiKey(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.del(`/workspaces/${workspaceId}/api-keys/${keyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys", workspaceId] }),
  });
}
