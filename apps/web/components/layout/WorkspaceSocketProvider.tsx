"use client";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useWorkspaceSocket } from "@/lib/hooks/useWorkspaceSocket";

// Renders nothing — mirrors BrandingProvider's pattern (a workspace-scoped side effect at the
// layout level, no visible UI). Keeps the real-time channel connected for whichever workspace is
// currently active, for as long as the dashboard is mounted.
export function WorkspaceSocketProvider() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  useWorkspaceSocket(workspaceId);
  return null;
}
