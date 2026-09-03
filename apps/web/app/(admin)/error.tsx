"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@growthos/ui/components/button";

/**
 * An error inside a console page, contained to the page.
 *
 * Same reasoning as the dashboard's boundary — keep the rail and the header so an operator is not
 * stranded — with one difference that matters here: an operator hitting this is usually mid-task on
 * someone else's account, so the copy says plainly that nothing was written. A console failure
 * where it is unclear whether the action landed is worse than the failure.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Console route error:", error);
  }, [error]);

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-8">
      <h2 className="font-display text-lg font-semibold tracking-tight">
        This view didn&rsquo;t load
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Something failed while rendering it. This is a read failure, not a write — no account was
        changed, and anything you had already submitted was recorded in the audit log at the time.
        The rest of the console is still working.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={reset}>
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
        {error.digest && (
          <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
            Reference {error.digest}
          </span>
        )}
      </div>
    </div>
  );
}
