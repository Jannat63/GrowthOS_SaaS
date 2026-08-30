"use client";
import { useState } from "react";
import { Gauge, Smartphone, Monitor } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useCoreWebVitals } from "@/lib/hooks/useCoreWebVitals";

function scoreTone(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 90) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

// Google's published thresholds for each field metric — "good" cutoffs, not GrowthOS's own opinion.
function lcpTone(ms: number | null) {
  if (ms == null) return undefined;
  return ms <= 2500 ? "text-success" : ms <= 4000 ? "text-warning" : "text-destructive";
}
function clsTone(score: number | null) {
  if (score == null) return undefined;
  return score <= 0.1 ? "text-success" : score <= 0.25 ? "text-warning" : "text-destructive";
}
function inpTone(ms: number | null) {
  if (ms == null) return undefined;
  return ms <= 200 ? "text-success" : ms <= 500 ? "text-warning" : "text-destructive";
}

export function CoreWebVitalsCard({ workspaceId }: { workspaceId: string | null }) {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  const { data, isFetching, isError, error } = useCoreWebVitals(workspaceId, submittedUrl, strategy);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Core Web Vitals</h2>
        </div>
        <Badge variant="muted">Google PageSpeed Insights — real data</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Real performance data for a single page, straight from Google. Uses real visitor data
        (CrUX) where Google has enough traffic to report it, and a simulated lab run otherwise.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) setSubmittedUrl(url.trim());
        }}
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yoursite.com/page-to-check"
          required
          className="h-9 min-w-64 flex-1 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setStrategy("mobile")}
            className={cn(
              "flex h-9 items-center gap-1.5 px-3 text-xs font-medium transition-colors",
              strategy === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
          <button
            type="button"
            onClick={() => setStrategy("desktop")}
            className={cn(
              "flex h-9 items-center gap-1.5 px-3 text-xs font-medium transition-colors",
              strategy === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
        </div>
        <button
          type="submit"
          disabled={isFetching}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFetching ? "Checking…" : "Check"}
        </button>
      </form>

      {isFetching ? (
        <Skeleton className="mt-6 h-24 w-full" />
      ) : isError ? (
        <p className="mt-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't fetch Core Web Vitals for this URL."}
        </p>
      ) : data ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3 text-center">
            <p className={cn("font-display text-2xl font-semibold tabular-nums", scoreTone(data.performanceScore))}>
              {data.performanceScore ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">Performance</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className={cn("font-display text-2xl font-semibold tabular-nums", lcpTone(data.lcpMs))}>
              {data.lcpMs != null ? `${(data.lcpMs / 1000).toFixed(1)}s` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">LCP</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className={cn("font-display text-2xl font-semibold tabular-nums", clsTone(data.clsScore))}>
              {data.clsScore != null ? data.clsScore.toFixed(2) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">CLS</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className={cn("font-display text-2xl font-semibold tabular-nums", inpTone(data.inpMs))}>
              {data.inpMs != null ? `${data.inpMs}ms` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">INP</p>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Enter a page URL above to check it.</p>
      )}
    </Card>
  );
}
