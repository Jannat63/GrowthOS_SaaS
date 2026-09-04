"use client";
import { useState } from "react";
import { Gauge, Smartphone, Monitor } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useCoreWebVitals } from "@/lib/hooks/useCoreWebVitals";

type Tone = "good" | "fair" | "poor" | "none";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-success",
  fair: "text-warning",
  poor: "text-destructive",
  none: "text-muted-foreground",
};

const TONE_LABEL: Record<Tone, string> = {
  good: "Good",
  fair: "Needs work",
  poor: "Poor",
  none: "No data",
};

/**
 * Google's own published cut-offs, not GrowthOS's opinion — which is exactly why they are printed
 * next to each number instead of only being encoded as a colour. The card previously tinted "3.2s"
 * amber and left the reader to guess what a good figure would have been; a threshold turns the
 * colour from a mood into something someone can act on.
 */
function grade(value: number | null, good: number, fair: number): Tone {
  if (value == null) return "none";
  return value <= good ? "good" : value <= fair ? "fair" : "poor";
}

/** The performance score runs the other way: higher is better. */
function gradeScore(value: number | null): Tone {
  if (value == null) return "none";
  return value >= 90 ? "good" : value >= 50 ? "fair" : "poor";
}

export function CoreWebVitalsCard({ workspaceId }: { workspaceId: string | null }) {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  const { data, isFetching, isError, error } = useCoreWebVitals(workspaceId, submittedUrl, strategy);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Page speed</h2>
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        How fast one page feels to the people loading it, measured by Google&rsquo;s PageSpeed
        Insights. Speed is a ranking factor and a conversion factor, so a slow landing page costs
        you twice — once in what you rank for, and again in what the traffic does when it arrives.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) setSubmittedUrl(url.trim());
        }}
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yoursite.com/page-to-check"
          aria-label="Page URL to check"
          required
          className="min-w-0 flex-1 sm:min-w-64"
        />
        <div className="flex h-10 overflow-hidden rounded-md border" role="group" aria-label="Device">
          <button
            type="button"
            onClick={() => setStrategy("mobile")}
            aria-pressed={strategy === "mobile"}
            className={cn(
              "flex h-full items-center gap-1.5 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              strategy === "mobile" ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> Mobile
          </button>
          <button
            type="button"
            onClick={() => setStrategy("desktop")}
            aria-pressed={strategy === "desktop"}
            className={cn(
              "flex h-full items-center gap-1.5 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              strategy === "desktop" ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"
            )}
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" /> Desktop
          </button>
        </div>
        <Button type="submit" disabled={isFetching}>
          {isFetching ? "Checking…" : "Check"}
        </Button>
      </form>

      {isFetching ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : isError ? (
        <p className="mt-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't fetch page speed for this URL."}
        </p>
      ) : data ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-4">
            <span
              className={cn(
                "font-display text-4xl font-semibold tabular-nums",
                TONE_TEXT[gradeScore(data.performanceScore)]
              )}
            >
              {data.performanceScore ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground">
              out of 100 on {strategy === "mobile" ? "mobile" : "desktop"} — good is 90 or above
            </span>
          </div>

          {/*
            Named in plain language, with the acronym second. The people using GrowthOS run
            marketing, not front-end performance work; "LCP" over a number told them nothing they
            could act on, while "how long the main content takes to appear" does.
          */}
          <dl className="divide-y">
            <Metric
              name="Main content appears"
              acronym="LCP"
              display={data.lcpMs != null ? `${(data.lcpMs / 1000).toFixed(1)}s` : null}
              threshold="under 2.5s"
              tone={grade(data.lcpMs, 2500, 4000)}
            />
            <Metric
              name="Layout stays put"
              acronym="CLS"
              display={data.clsScore != null ? data.clsScore.toFixed(2) : null}
              threshold="under 0.10"
              tone={grade(data.clsScore, 0.1, 0.25)}
            />
            <Metric
              name="Responds to a tap"
              acronym="INP"
              display={data.inpMs != null ? `${data.inpMs}ms` : null}
              threshold="under 200ms"
              tone={grade(data.inpMs, 200, 500)}
            />
          </dl>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Enter a page URL to check it. One page at a time — try the page your ads point at.
        </p>
      )}
    </Card>
  );
}

function Metric({
  name,
  acronym,
  display,
  threshold,
  tone,
}: {
  name: string;
  acronym: string;
  display: string | null;
  threshold: string;
  tone: Tone;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <dt className="min-w-0">
        <span className="text-sm">{name}</span>{" "}
        <span className="font-mono text-[11px] text-muted-foreground">{acronym}</span>
        <span className="block text-xs text-muted-foreground">Good is {threshold}</span>
      </dt>
      <dd className="flex items-baseline gap-2.5">
        <span className={cn("font-display text-lg font-semibold tabular-nums", TONE_TEXT[tone])}>
          {display ?? "—"}
        </span>
        <span className={cn("text-xs font-medium", TONE_TEXT[tone])}>{TONE_LABEL[tone]}</span>
      </dd>
    </div>
  );
}
