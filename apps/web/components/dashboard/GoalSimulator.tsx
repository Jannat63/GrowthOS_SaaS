"use client";
import { useState } from "react";
import { Target } from "lucide-react";
import type { GrowthHubResponse } from "@growthos/types";
import { simulateGoal } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { LockedField } from "@/components/LockedField";
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

/**
 * Where the simulator starts.
 *
 * It used to open at `currentSessions`, so the very first thing it showed was a projection
 * identical to the numbers already on the page — projected conversions equal to actual
 * conversions. A tool whose default state demonstrates that nothing changes when nothing changes
 * reads as broken. Opening one preset in means it answers its own question on sight, and the
 * uplift figures below give it something to say.
 */
const DEFAULT_FACTOR = 1.25;

/** The difference the target makes against today. Silent at zero — "+0" is noise, not information. */
function Uplift({ value, prefix = "" }: { value: number; prefix?: string }) {
  if (value === 0) return null;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        value > 0 ? "text-success" : "text-destructive"
      )}
    >
      {value > 0 ? "+" : "−"}
      {prefix}
      {Math.abs(value).toLocaleString()}
    </span>
  );
}

export function GoalSimulator({ baseline }: { baseline: GrowthHubResponse["baseline"] | undefined }) {
  // `undefined` = untouched, so the input sits at DEFAULT_FACTOR until the user takes over.
  const [target, setTarget] = useState<number | undefined>(undefined);

  if (!baseline) {
    return (
      <Card className="p-5">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const rates = {
    currentConversionRate: baseline.currentConversionRate,
    currentAOV: baseline.currentAOV,
  };
  const targetSessions = target ?? Math.round(baseline.currentSessions * DEFAULT_FACTOR);
  const result = simulateGoal(rates, { targetSessions });
  // The same projection at today's session count, so the panel can report the *difference* the
  // target makes rather than an absolute the reader has to diff against the tiles themselves.
  const atToday = simulateGoal(rates, { targetSessions: baseline.currentSessions });
  const upliftConversions = result.projectedConversions - atToday.projectedConversions;
  const upliftRevenue = result.projectedRevenue - atToday.projectedRevenue;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Target className="h-3.5 w-3.5" /> Goal simulator
      </div>

      <label htmlFor="target-sessions" className="mt-3 block text-xs text-muted-foreground">
        Target sessions
      </label>
      {/* Locked until Edit. The presets below still set it in one click, which is the fast path -
          the lock is there for the slow one, where a stray keystroke or a scroll used to rewrite
          the target without anyone asking for it. */}
      <LockedField
        id="target-sessions"
        label="target sessions"
        type="number"
        value={targetSessions}
        onChange={(next) => setTarget(Math.max(0, Number(next) || 0))}
        display={(v) => Number(v).toLocaleString()}
        inputProps={{ min: 0, step: 1000 }}
        className="mt-1"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const value = Math.round(baseline.currentSessions * p.factor);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => setTarget(value)}
              aria-pressed={targetSessions === value}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                targetSessions === value
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setTarget(baseline.currentSessions)}
          aria-pressed={targetSessions === baseline.currentSessions}
          className={cn(
            "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
            targetSessions === baseline.currentSessions
              ? "border-primary/40 bg-primary/10 text-primary"
              : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          Today
        </button>
      </div>

      <dl className="mt-auto space-y-1 pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted-foreground">Projected conversions</dt>
          <dd className="flex items-baseline gap-1.5 font-display font-semibold tabular-nums">
            {result.projectedConversions.toLocaleString()}
            <Uplift value={upliftConversions} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted-foreground">Projected revenue</dt>
          <dd className="flex items-baseline gap-1.5 font-display font-semibold tabular-nums">
            ${result.projectedRevenue.toLocaleString()}
            <Uplift value={upliftRevenue} prefix="$" />
          </dd>
        </div>
      </dl>

      <Badge className={cn("mt-3 w-fit", CONFIDENCE_TONE[result.confidence])} variant="muted">
        {result.confidence} confidence
      </Badge>
    </Card>
  );
}
