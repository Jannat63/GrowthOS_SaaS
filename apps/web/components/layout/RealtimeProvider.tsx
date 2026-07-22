"use client";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useRealtime } from "@/lib/hooks/useRealtime";

/**
 * Mount-once bridge that connects the real-time WebSocket layer to the active workspace.
 * Renders nothing — it just runs the useRealtime effect inside the dashboard tree so live
 * events refresh caches and raise toasts. Reconnects automatically on workspace switch.
 */
export function RealtimeProvider() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  useRealtime(activeWorkspaceId);
  return null;
}
