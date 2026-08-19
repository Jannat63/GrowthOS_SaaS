"use client";
import Link from "next/link";
import { Info } from "lucide-react";
import { useConnections } from "@/lib/hooks/useConnections";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";

/**
 * States plainly, once per page, that a workspace with nothing connected is looking at
 * demonstration figures.
 *
 * The `DataSourceBadge` marks each view individually, but a badge is small and easy to read past —
 * and the situation it describes is currently the default for every new workspace, not an edge
 * case. Someone can otherwise browse a full dashboard of revenue, spend and ROAS without ever
 * registering that none of it is theirs. That is a trust problem before it is a UI problem
 * (docs/AUDIT-2026-08-13-codebase.md #14).
 *
 * Deliberately not dismissible. A dismissal would persist past the moment the numbers stop being
 * hypothetical, and the cost of being reminded is much lower than the cost of forgetting.
 *
 * It disappears on its own the moment any platform is connected, at which point the per-view badges
 * take over and distinguish which channels are real.
 */
export function SampleDataNotice() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const { data: connections, isPending } = useConnections(workspaceId);

  // Say nothing until the answer is known — flashing this up and retracting it is worse than a
  // brief absence, because it reads as the app changing its mind about whether the data is real.
  if (isPending || !connections) return null;
  if (connections.data.some((c) => c.isActive)) return null;

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          You&rsquo;re viewing sample data.
        </span>{" "}
        No accounts are connected yet, so every figure here is a demonstration — not your
        performance.{" "}
        <Link
          href="/settings"
          className="font-medium text-primary underline underline-offset-4"
        >
          Connect a channel
        </Link>{" "}
        to see your own.
      </p>
    </div>
  );
}
