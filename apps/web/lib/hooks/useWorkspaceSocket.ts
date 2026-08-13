"use client";
import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface WsEvent {
  type:
    | "connected"
    | "recommendation:new"
    | "job:complete"
    | "job:failed"
    | "meta:fatigue_alert"
    | "analytics:mer_alert"
    | "intelligence:report_ready";
  workspaceId: string;
  payload?: Record<string, unknown>;
}

/**
 * Real-time push for the 5 events named across P2.5/P2.6/P2.7/P3.4 as deferred. Purely additive:
 * every view this touches already fetches its own data via TanStack Query with a normal
 * `staleTime` — if this socket never connects (blocked by a proxy, offline, whatever), the app
 * behaves exactly as it did before this hook existed. Nothing here is load-bearing.
 */
export function useWorkspaceSocket(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    if (!workspaceId) return;
    let socket: WebSocket | null = null;
    let closedByEffect = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const wsUrl = `${API_URL.replace(/^http/, "ws")}/api/v1/workspaces/${workspaceId}/ws`;
      socket = new WebSocket(wsUrl);

      socket.onmessage = (raw) => {
        let event: WsEvent;
        try {
          event = JSON.parse(raw.data as string);
        } catch {
          return;
        }
        if (event.type === "connected") {
          reconnectAttempt.current = 0;
          return;
        }
        handleEvent(event, qc);
      };

      socket.onclose = () => {
        if (closedByEffect) return;
        // Simple capped backoff — this is a nice-to-have channel, not worth hammering the server.
        const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt.current);
        reconnectAttempt.current++;
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      closedByEffect = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [workspaceId, qc]);
}

function handleEvent(event: WsEvent, qc: QueryClient) {
  switch (event.type) {
    case "recommendation:new":
      qc.invalidateQueries({ queryKey: ["recommendations", event.workspaceId] });
      toast.info("New recommendations are ready");
      break;
    case "job:complete":
      if (event.payload?.jobId) {
        qc.invalidateQueries({ queryKey: ["job", event.workspaceId, event.payload.jobId] });
      }
      toast.success("Your analysis finished");
      break;
    case "job:failed":
      if (event.payload?.jobId) {
        qc.invalidateQueries({ queryKey: ["job", event.workspaceId, event.payload.jobId] });
      }
      toast.error("A background job failed");
      break;
    case "meta:fatigue_alert":
      qc.invalidateQueries({ queryKey: ["fatigue", event.workspaceId] });
      qc.invalidateQueries({ queryKey: ["recommendations", event.workspaceId] });
      toast.warning("New creative fatigue alert");
      break;
    case "analytics:mer_alert":
      // Partial key — matches every ["mer", workspaceId, days] variant regardless of the days param.
      qc.invalidateQueries({ queryKey: ["mer", event.workspaceId] });
      toast.warning("Blended MER anomaly detected");
      break;
    case "intelligence:report_ready":
      qc.invalidateQueries({ queryKey: ["intelligence-report", event.workspaceId] });
      break;
  }
}
