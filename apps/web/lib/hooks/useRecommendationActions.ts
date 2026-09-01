"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RecommendationStatus } from "@growthos/types";
import { api } from "@/lib/api/client";

const STATUS_LABEL: Record<RecommendationStatus, string> = {
  pending: "reopened",
  acted: "marked as acted on",
  snoozed: "snoozed",
  dismissed: "dismissed",
};

// Act / dismiss / snooze a recommendation, then refresh the queues that show it. Used by
// Creative Queue, Content Pipeline, Fatigue Monitor, and the Recommendations page — one fix here
// covers all four. Previously had no onSuccess/onError feedback at all: a failed click looked
// identical to a successful one, since nothing in the UI reacted to the mutation's error state.
export function useRecommendationActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RecommendationStatus }) =>
      api.patch(`/workspaces/${workspaceId}/recommendations/${id}`, { status }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["recommendations", workspaceId] });
      qc.invalidateQueries({ queryKey: ["content-briefs", workspaceId] });
      toast.success(`Recommendation ${STATUS_LABEL[variables.status]}.`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't update that recommendation — try again.");
    },
  });
}
