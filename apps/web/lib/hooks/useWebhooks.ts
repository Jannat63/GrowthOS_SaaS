"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatedWebhookEndpointResponse, WebhookEndpoint } from "@growthos/types";
import { api } from "@/lib/api/client";

// No live/mock fallback, same reasoning as useApiKeys: creating or deleting a webhook endpoint is a
// real security action against a real credential, not something to silently fake when the API is
// unreachable. A mocked "created" here would hand the user a secret that signs nothing.
export function useWebhooks(workspaceId: string | null | undefined) {
  return useQuery<{ data: WebhookEndpoint[]; total: number }>({
    queryKey: ["webhooks", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      api.get<{ data: WebhookEndpoint[]; total: number }>(`/workspaces/${workspaceId}/webhooks`),
  });
}

export function useCreateWebhook(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { url: string; eventTypes: string[] }) =>
      api.post<CreatedWebhookEndpointResponse>(`/workspaces/${workspaceId}/webhooks`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks", workspaceId] }),
  });
}

export function useDeleteWebhook(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) => api.del(`/workspaces/${workspaceId}/webhooks/${webhookId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks", workspaceId] }),
  });
}

export function useEnableWebhook(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) =>
      api.post<WebhookEndpoint>(`/workspaces/${workspaceId}/webhooks/${webhookId}/enable`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks", workspaceId] }),
  });
}
