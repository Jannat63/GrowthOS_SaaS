import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SIZE = 120;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function tierFor(score: number): { label: string; className: string } {
  if (score >= 80) return { label: "Excellent", className: "text-success" };
  if (score >= 60) return { label: "Good", className: "text-primary" };
  if (score >= 40) return { label: "Fair", className: "text-warning" };
  return { label: "Needs attention", className: "text-destructive" };
}

export type ScoreDriver = {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Only the driver actually pulling the score down earns a warning colour — see tone.ts. */
  attention: boolean;
};

/**
 * A composite 0-100 score for the workspace, built from signals GrowthOS actually has
 * (MER trend, at-risk creatives, open high-urgency work) — see computeGrowthScore. Deliberately
 * does not claim a percentile against other businesses; there's no peer dataset behind this app
 * to back that claim.
 *
 * `drivers`, when passed, renders the three weighted inputs beside the ring. The number alone
 * answers "how are we doing" but not "why" — and without this the card that holds it was one
 * 120px circle floating in a full-width row, empty from the label onward. These three lines are
 * the same figures `computeGrowthScore` actually weighted (40/30/30), not a fresh summary of the
 * page, so the score and its explanation cannot drift out of sync with each other.
 */
export function ScoreGauge({ score, drivers }: { score: number; drivers?: ScoreDriver[] }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier = tierFor(clamped);
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
      <div className="flex min-w-0 items-center gap-4">
        <div className={cn("relative shrink-0", tier.className)} style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            role="img"
            aria-label={`Growth score ${clamped} out of 100, ${tier.label}`}
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold tabular-nums text-foreground">
              {clamped}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", tier.className)}>{tier.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Based on efficiency trend, creative health, and open priority work.
          </p>
        </div>
      </div>

      {drivers && drivers.length > 0 && (
        // A real 3-up grid rather than a loosely gapped row: each cell is equal width and claims
        // its own third of whatever space is left, so the row reaches the card's edge instead of
        // clustering left with the remainder trailing off as dead air. `divide-x` draws the seams
        // between cells at full contrast — a single hairline border here (the ordinary `border`
        // token) sits within a few percent luminance of the card behind it and reads as no line
        // at all, which is why the first pass looked like three unrelated facts, not a strip.
        <div className="grid flex-1 grid-cols-1 divide-y divide-border border-t pt-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          {drivers.map((d) => (
            <div key={d.label} className="flex items-start gap-2.5 px-1 py-3 first:pt-0 sm:px-6 sm:py-0 sm:first:pl-0">
              <d.icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  d.attention ? "text-warning" : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <div>
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    d.attention ? "text-warning" : "text-foreground"
                  )}
                >
                  {d.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Weighted composite from real workspace signals already on this page — no external benchmark
 * dataset exists in this app, so this is self-referential (your account vs. its own trend),
 * never a vs.-peers percentile claim.
 *  - MER trend direction (is blended efficiency improving or slipping): 40%
 *  - Creatives at risk of fatigue, count-based decay: 30%
 *  - High-urgency recommendations still pending, count-based decay: 30%
 */
export function computeGrowthScore(input: {
  merTrendPct: number | null; // % change in blended MER vs. prior window
  atRiskCreatives: number;
  highUrgencyPending: number;
}): number {
  const merComponent =
    input.merTrendPct == null ? 60 : Math.max(0, Math.min(100, 60 + input.merTrendPct * 2));
  const creativeComponent = Math.max(0, 100 - input.atRiskCreatives * 15);
  const workloadComponent = Math.max(0, 100 - input.highUrgencyPending * 12);

  return Math.round(merComponent * 0.4 + creativeComponent * 0.3 + workloadComponent * 0.3);
}
