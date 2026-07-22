"use client";
import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import type { WebSocketEvent } from "@growthos/types";
import { RealtimeClient } from "@/lib/realtime/client";

export interface EventPlan {
  /** Exact query keys to invalidate. */
  keys: QueryKey[];
  /** When true, invalidate every query scoped to this workspace (key[1] === workspaceId). */
  invalidateWorkspace?: boolean;
  /** Optional toast message. */
  toast?: string;
  /** Stable toast id so a standing condition (e.g. a MER anomaly) never stacks duplicates. */
  toastId?: string;
}

/**
 * Pure mapping from a real-time event to the caches it should refresh and the toast (if any)
 * to raise. Kept side-effect-free so it can be unit-tested without React or a socket.
 */
export function planForEvent(event: WebSocketEvent, workspaceId: string): EventPlan {
  switch (event.type) {
    case "job:complete":
      // A finished job can touch onboarding, growth hub, recommendations — refresh the lot.
      return { keys: [["me"]], invalidateWorkspace: true };
    case "recommendation:new":
      return {
        keys: [
          ["recommendations", workspaceId],
          ["growth-hub", workspaceId],
          ["content-briefs", workspaceId],
        ],
        toast: "New growth recommendation available",
        toastId: `rec-new-${workspaceId}`,
      };
    case "meta:fatigue_alert":
      return {
        keys: [
          ["fatigue", workspaceId],
          ["recommendations", workspaceId],
        ],
        toast: "Creative fatigue detected on an ad set",
        toastId: `fatigue-${workspaceId}`,
      };
    case "analytics:mer_alert":
      return {
        keys: [["mer", workspaceId]],
        toast: "Blended MER anomaly detected",
        toastId: `mer-${workspaceId}`,
      };
    case "report:ready":
      return {
        keys: [["intelligence-report", workspaceId]],
        toast: "Your weekly intelligence report was updated",
        toastId: `report-${workspaceId}`,
      };
    default:
      return { keys: [] };
  }
}

/**
 * Connect to the real-time WS layer for the active workspace. On each event, refreshes the
 * matching TanStack Query caches and raises a toast. Reconnects and re-subscribes on
 * workspace switch (the effect tears down and rebuilds). Additive — polling still backs it.
 */
export function useRealtime(workspaceId: string | null): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    const client = new RealtimeClient((event) => {
      const plan = planForEvent(event, workspaceId);
      if (plan.invalidateWorkspace) {
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === workspaceId });
      }
      for (const key of plan.keys) void qc.invalidateQueries({ queryKey: key });
      if (plan.toast) toast(plan.toast, plan.toastId ? { id: plan.toastId } : undefined);
    });

    client.connect(workspaceId);
    return () => client.close();
  }, [workspaceId, qc]);
}
