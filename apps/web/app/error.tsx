"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@growthos/ui/components/button";
import { Logo } from "@/components/marketing/Logo";

/**
 * The route error boundary, styled to match not-found.tsx.
 *
 * The two were built separately and looked it — the 404 carried the brand mark and the Signal type
 * scale, while this one opened with a large exclamation mark and a pair of hand-rolled buttons. A
 * person who hits both in one session should not conclude they have wandered into two different
 * products at the exact moment they are already unsure what went wrong.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No client-side error monitoring is wired up yet (see the production-readiness notes) — this
    // is at least a paper trail in the browser console rather than the error vanishing silently.
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="mt-12 font-mono text-[11px] tracking-[0.18em] text-destructive">Error</p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        This page didn&rsquo;t load
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
        Something failed while rendering it. Your data is untouched — nothing here was saving. Try
        again, and if it keeps happening, send us the reference below.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>

      {/*
        The digest is the only thread between "it broke for me" and the matching server log. It was
        being dropped, which left support with a screenshot and nothing to search on.
      */}
      {error.digest && (
        <p className="mt-8 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
          Reference {error.digest}
        </p>
      )}
    </main>
  );
}
