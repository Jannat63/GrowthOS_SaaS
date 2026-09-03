"use client";
import { Gauge } from "lucide-react";
import type { CreativeScore, ScoreBand } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { useCreativeScorecard } from "@/lib/hooks/useCreativeScorecard";

/**
 * Creative scorecard (M4 · P4.2a-2).
 *
 * Grades creatives that have ACTUALLY RUN against this account's own trailing CTR median — it is
 * not a prediction, and the copy says so, because "predicted performance" is a claim this codebase
 * has neither the model nor the training data to make honestly.
 *
 * Every band is stated relative to the account and shown beside the number it was derived from, so
 * a reader can disagree with the verdict on the evidence rather than having to trust it.
 */
const BAND_STYLE: Record<ScoreBand, string> = {
  strong: "border-success/30 bg-success/10 text-success",
  average: "border-border bg-secondary/40 text-muted-foreground",
  underperforming: "border-destructive/30 bg-destructive/10 text-destructive",
  "insufficient-data": "border-border bg-secondary/30 text-muted-foreground",
};

const BAND_LABEL: Record<ScoreBand, string> = {
  strong: "Strong",
  average: "Typical",
  underperforming: "Underperforming",
  "insufficient-data": "Not enough data",
};

export function CreativeScorecard({ workspaceId }: { workspaceId: string | null }) {
  const { data: scorecard } = useCreativeScorecard(workspaceId);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Creative scorecard</h2>
        </div>
        {scorecard && (
          <DataSourceBadge source={scorecard.source} platform={MODULE_PLATFORMS.fatigue} />
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        How creatives that have <em>already run</em> compare with this account&rsquo;s own median
        click-through rate. Not a prediction of how new creative will perform.
      </p>

      {!scorecard ? (
        <Skeleton className="mt-4 h-48 w-full" />
      ) : scorecard.data.scores.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No creatives with recent performance data yet.
        </p>
      ) : (
        <>
          {scorecard.data.medianCtr !== null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Account median CTR{" "}
              <span className="font-medium text-foreground">
                {scorecard.data.medianCtr.toFixed(2)}%
              </span>{" "}
              across {scorecard.data.creativeCount} creatives.
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {scorecard.data.scores.map((s) => (
              <ScoreRow key={s.name} score={s} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/**
 * One creative, led by the number that decides its band.
 *
 * CTR appeared twice on every row — once inside `reason` ("CTR 1.80% — 18% below…") and once in
 * the figures underneath — and frequency appeared twice on saturated rows. The engine's sentence
 * is now interpretation only, so the measurement is stated once, at the size that says it is the
 * one that matters.
 */
function ScoreRow({ score }: { score: CreativeScore }) {
  // No hover: this row is a read-out with no controls, and a hover state on it would promise a
  // click that does not exist. Hover marks rows you can act on.
  return (
    <li className="rounded-lg border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="font-mono text-lg font-semibold tabular-nums leading-none">
            {score.ctr.toFixed(2)}%
          </span>
          <p className="min-w-0 truncate text-sm font-medium">{score.name}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
            BAND_STYLE[score.band]
          )}
        >
          {BAND_LABEL[score.band]}
        </span>
      </div>

      <MedianDeviation percent={score.ctrVsMedianPercent} band={score.band} />

      {/* The reason, always — a band on its own is a verdict the reader cannot check. */}
      <p className="mt-2 text-sm text-muted-foreground">{score.reason}</p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <span>
          Frequency{" "}
          <span className="font-medium text-foreground">{score.frequency.toFixed(1)}</span>
        </span>
        {score.cpm !== null && (
          // Shown for context only — it never moves the band. Efficiency needs spend and
          // conversions, which `creative_performance` does not carry.
          <span>
            CPM <span className="font-medium text-foreground">${score.cpm.toFixed(2)}</span>
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Distance from the account median, as a bar growing out from a centre tick.
 *
 * Five rows of prose all saying "x% above/below the median" is a table the reader has to parse row
 * by row. The same five numbers on a shared centre line are a shape — which creatives sit above
 * and how far apart they are becomes one glance instead of five readings. Clamped at +/-100%,
 * which is well past the range that changes any decision.
 */
function MedianDeviation({ percent, band }: { percent: number | null; band: ScoreBand }) {
  // Null when the account has no usable median — there is nothing to be above or below, and a bar
  // pinned at centre would assert "exactly average" where the honest answer is "not measurable".
  if (percent === null) return null;

  const magnitude = Math.min(Math.abs(percent), 100) / 100;
  const above = percent >= 0;
  return (
    <div
      className="relative mt-2.5 h-1 w-full rounded-full bg-border"
      role="img"
      aria-label={`${Math.abs(percent).toFixed(0)} percent ${
        above ? "above" : "below"
      } the account median`}
    >
      {/* The median itself. Everything is measured from here, so it stays visible at zero width. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/60"
      />
      <span
        aria-hidden
        className={cn(
          "absolute top-0 h-full",
          above ? "left-1/2 rounded-r-full" : "right-1/2 rounded-l-full",
          band === "strong" && "bg-success",
          band === "underperforming" && "bg-destructive",
          band !== "strong" && band !== "underperforming" && "bg-muted-foreground/50"
        )}
        style={{ width: `${magnitude * 50}%` }}
      />
    </div>
  );
}
