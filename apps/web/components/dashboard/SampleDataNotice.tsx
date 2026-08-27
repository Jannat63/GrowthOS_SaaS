"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, X } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
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
 * It disappears on its own the moment any platform is connected, at which point the per-view badges
 * take over and distinguish which channels are real.
 */

const DISMISS_KEY = "growthos:sample-data-notice-dismissed";

/**
 * Dismissal is deliberately `sessionStorage`, not `localStorage`, and is keyed per workspace.
 *
 * The banner was originally not dismissible at all, because a permanent dismissal outlives the
 * reason for it: someone hides the notice on day one, connects nothing, and six weeks later is
 * reading demonstration revenue with nothing on screen saying so. Session scope keeps the escape
 * hatch — one click and it is gone for as long as you are working — without letting "I've seen it"
 * harden into "I was never told". A new visit asks again; connecting a channel ends it for good.
 *
 * Per workspace because a second workspace with nothing connected is a different set of invented
 * numbers, and deserves its own warning.
 */
function dismissKeyFor(workspaceId: string) {
  return `${DISMISS_KEY}:${workspaceId}`;
}

export function SampleDataNotice() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const { data: connections, isPending } = useConnections(workspaceId);
  const [dismissed, setDismissed] = useState(false);

  // Read in an effect rather than during render: the server has no sessionStorage, so deriving the
  // initial state from it would make the first client render disagree with the server's HTML.
  useEffect(() => {
    if (!workspaceId) {
      setDismissed(false);
      return;
    }
    try {
      setDismissed(window.sessionStorage.getItem(dismissKeyFor(workspaceId)) === "1");
    } catch {
      // Storage can throw outright (private windows, blocked site data). Showing the notice is the
      // safe failure — it just won't stay dismissed.
      setDismissed(false);
    }
  }, [workspaceId]);

  function dismiss() {
    setDismissed(true);
    if (!workspaceId) return;
    try {
      window.sessionStorage.setItem(dismissKeyFor(workspaceId), "1");
    } catch {
      // Dismissal still applies to this render; it just won't survive a page load.
    }
  }

  // Say nothing until the answer is known — flashing this up and retracting it is worse than a
  // brief absence, because it reads as the app changing its mind about whether the data is real.
  if (isPending || !connections) return null;
  if (connections.data.some((c) => c.isActive)) return null;
  if (dismissed) return null;

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
      <Button
        variant="ghost"
        size="icon"
        onClick={dismiss}
        aria-label="Hide the sample-data notice for this session"
        title="Hide for this session"
        className="-my-1 -mr-2 ml-auto h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
