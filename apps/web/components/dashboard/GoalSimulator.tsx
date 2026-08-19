"use client";
import { useState } from "react";
import { Target } from "lucide-react";
import type { GrowthHubResponse } from "@growthos/types";
import { simulateGoal } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Input } from "@growthos/ui/components/input";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";

/**
 * Goal Simulator — "if traffic reached X, what would that be worth?"
 *
 * The projection runs entirely client-side through the tested `simulateGoal` engine; the API only
 * supplies the baseline (conversion rate, AOV, current sessions) it projects from, which rides along
 * in the Growth Hub response. That keeps every keystroke instant and adds no request per adjustment.
 */

const CONFIDENCE_TONE: Record<string, string> = {
  High: "bg-success/10 text-success",
  Medium: "bg-primary/10 text-primary",
  Low: "bg-destructive/10 text-destructive",
};

/** Multipliers of the current session count — a target relative to where you are reads better than an absolute number. */
const PRESETS = [
  { label: "+25%", factor: 1.25 },
  { label: "+50%", factor: 1.5 },
  { label: "2×", factor: 2 },
];

export function GoalSimulator({ baseline }: { baseline: GrowthHubResponse["baseline"] | undefined }) {
  // `undefined` = untouched, so the input tracks the baseline until the user takes over.
  const [target, setTarget] = useState<number | undefined>(undefined);

  if (!baseline) {
    return (
      <Card className="p-5">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const targetSessions = target ?? baseline.currentSessions;
  const result = simulateGoal(
    { currentConversionRate: baseline.currentConversionRate, currentAOV: baseline.currentAOV },
    { targetSessions }
  );

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Target className="h-3.5 w-3.5" /> Goal simulator
      </div>

      <label htmlFor="target-sessions" className="mt-3 block text-xs text-muted-foreground">
        Target sessions
      </label>
      <Input
        id="target-sessions"
        type="number"
        min={0}
        step={1000}
        value={targetSessions}
        onChange={(e) => setTarget(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 tabular-nums"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setTarget(Math.round(baseline.currentSessions * p.factor))}
            className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
        {target !== undefined && (
          <button
            type="button"
            onClick={() => setTarget(undefined)}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <dl className="mt-auto space-y-1 pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted-foreground">Projected conversions</dt>
          <dd className="font-display font-semibold tabular-nums">
            {result.projectedConversions.toLocaleString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted-foreground">Projected revenue</dt>
          <dd className="font-display font-semibold tabular-nums">
            ${result.projectedRevenue.toLocaleString()}
          </dd>
        </div>
      </dl>

      <Badge className={cn("mt-3 w-fit", CONFIDENCE_TONE[result.confidence])} variant="muted">
        {result.confidence} confidence
      </Badge>
    </Card>
  );
}
