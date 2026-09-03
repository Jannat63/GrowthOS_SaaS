"use client";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Recommendation, RecommendationStatus } from "@growthos/types";
import { api } from "@/lib/api/client";

/** The shape `useRecommendations` caches. Patched in place for optimistic updates. */
type Cached = { data: Recommendation[]; source: "live" | "mock"; total: number };

export interface StatusChange {
  id: string;
  status: RecommendationStatus;
  /** When a snoozed item returns. Omitted = snoozed with no end date. */
  snoozedUntil?: string;
}

/** How long "Snooze" defers something when no explicit date is chosen. */
export const DEFAULT_SNOOZE_DAYS = 7;

export function snoozeUntil(days = DEFAULT_SNOOZE_DAYS): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

const STATUS_LABEL: Record<RecommendationStatus, string> = {
  pending: "reopened",
  acted: "marked as acted on",
  snoozed: "snoozed",
  dismissed: "dismissed",
};

function patchCache(qc: QueryClient, workspaceId: string | null | undefined, change: StatusChange) {
  const key = ["recommendations", workspaceId];
  const previous = qc.getQueryData<Cached>(key);
  if (previous) {
    qc.setQueryData<Cached>(key, {
      ...previous,
      data: previous.data.map((r) =>
        r.id === change.id
          ? {
              ...r,
              status: change.status,
              snoozedUntil: change.status === "snoozed" ? (change.snoozedUntil ?? null) : null,
              actedAt: change.status === "acted" ? new Date().toISOString() : r.actedAt,
            }
          : r
      ),
    });
  }
  return previous;
}

/**
 * Act / dismiss / snooze a recommendation, then refresh the queues that show it. Used by Creative
 * Queue, Content Pipeline, Fatigue Monitor, and the Recommendations page — one fix here covers all
 * four.
 *
 * Applied optimistically. Acting on something is the one interaction on this page, and it moves
 * the row between filtered groups — without the optimistic patch the card sat visibly unchanged
 * until the round trip returned, which reads as a dead button and invites a second click on a row
 * that is already on its way out. The pre-mutation cache is captured so a failure puts the row back
 * exactly where it was rather than leaving the screen disagreeing with the server.
 *
 * The toasts are the other half of that: the rollback restores the row, and the error toast is what
 * says why it came back. Without it a failed click looked identical to a successful one.
 */
export function useRecommendationActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();

  return useMutation<unknown, Error, StatusChange, { previous: Cached | undefined }>({
    mutationFn: ({ id, status, snoozedUntil }: StatusChange) =>
      api.patch(`/workspaces/${workspaceId}/recommendations/${id}`, {
        status,
        ...(snoozedUntil ? { snoozedUntil } : {}),
      }),

    onMutate: async (change) => {
      await qc.cancelQueries({ queryKey: ["recommendations", workspaceId] });
      return { previous: patchCache(qc, workspaceId, change) };
    },

    onSuccess: (_data, variables) => {
      toast.success(`Recommendation ${STATUS_LABEL[variables.status]}.`);
    },

    onError: (err, _change, context) => {
      if (context?.previous) {
        qc.setQueryData(["recommendations", workspaceId], context.previous);
      }
      toast.error(
        err instanceof Error ? err.message : "Couldn't update that recommendation — try again."
      );
    },

    // Invalidate on settle, not on success: a rolled-back failure must also re-read the server,
    // or the restored row keeps whatever the optimistic patch briefly showed.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["recommendations", workspaceId] });
      qc.invalidateQueries({ queryKey: ["content-briefs", workspaceId] });
    },
  });
}

/**
 * Dismissing is the only destructive action here and it had no way back — the row left the queue
 * and the page offered no route to it. This pairs it with the standard undo affordance rather than
 * a confirmation dialog, which would tax the common case (clearing several at once) to guard the
 * rare one.
 */
export function toastUndoableDismiss(
  title: string,
  undo: () => void,
) {
  toast(`Dismissed "${title}"`, {
    action: { label: "Undo", onClick: undo },
  });
}
