"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RecommendationComment } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

// Comment thread for one recommendation. Fetched lazily — pass `enabled` so the query only
// runs when the card's thread is opened (avoids one request per recommendation up front).
export function useRecommendationComments(
  workspaceId: string | null | undefined,
  recId: string | null | undefined,
  enabled: boolean
) {
  return useQuery<{ data: RecommendationComment[]; source: "live" | "mock" }>({
    queryKey: ["rec-comments", workspaceId, recId],
    enabled: Boolean(workspaceId) && Boolean(recId) && enabled,
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: RecommendationComment[]; total: number }>(
              `/workspaces/${workspaceId}/recommendations/${recId}/comments`
            )
          ).data,
        () => [] as RecommendationComment[]
      ),
  });
}

// Add a comment / assign a recommendation, then refresh the affected queries.
export function useCollaborationActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();

  const addComment = useMutation({
    mutationFn: ({ recId, body }: { recId: string; body: string }) =>
      api.post(`/workspaces/${workspaceId}/recommendations/${recId}/comments`, { body }),
    onSuccess: (_data, { recId }) => {
      qc.invalidateQueries({ queryKey: ["rec-comments", workspaceId, recId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't post that comment — try again.");
    },
  });

  /**
   * Assign a recommendation, optionally with a target date.
   *
   * `dueDate` has been accepted by this endpoint and stored on the row since M3 P3.5, and nothing
   * ever sent it — so "Assigned" meant a name and no commitment. Passed as `undefined` when the
   * caller doesn't set one, so an assignee change never silently clears a date someone else set;
   * pass an explicit `null` to clear it.
   */
  const assign = useMutation({
    mutationFn: ({
      recId,
      assignedTo,
      dueDate,
    }: {
      recId: string;
      assignedTo: string | null;
      dueDate?: string | null;
    }) =>
      api.patch(`/workspaces/${workspaceId}/recommendations/${recId}/assignment`, {
        assignedTo,
        ...(dueDate === undefined ? {} : { dueDate }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendations", workspaceId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't update the assignment — try again.");
    },
  });

  return { addComment, assign };
}
