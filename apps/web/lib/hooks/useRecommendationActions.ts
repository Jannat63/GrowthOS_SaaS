"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RecommendationStatus } from "@growthos/types";
import { api } from "@/lib/api/client";

// Act / dismiss / snooze a recommendation, then refresh the queues that show it.
export function useRecommendationActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RecommendationStatus }) =>
      api.patch(`/workspaces/${workspaceId}/recommendations/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendations", workspaceId] });
      qc.invalidateQueries({ queryKey: ["content-briefs", workspaceId] });
    },
  });
}
