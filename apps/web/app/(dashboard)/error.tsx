"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@growthos/ui/components/button";

/**
 * An error inside a dashboard page, contained to the page.
 *
 * Without this, a failure in any dashboard route escaped to the root boundary, which renders a
 * full-screen centred page — so a broken chart took the sidebar, the workspace switcher and the
 * navigation with it, and the only way anywhere was the browser's back button. Catching it at the
 * group boundary keeps the shell intact: the rest of the product is still usable while one module
 * is not.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        This module didn&rsquo;t load
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Something failed while rendering it. Nothing was being saved, so your workspace data is
        unchanged. The rest of GrowthOS is still working — try again, or move on and come back.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={reset}>
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
        {/* The only thread between "it broke for me" and the matching server log. */}
        {error.digest && (
          <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
            Reference {error.digest}
          </span>
        )}
      </div>
    </div>
  );
}
