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

function ScoreRow({ score }: { score: CreativeScore }) {
  return (
    <li className="rounded-lg border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{score.name}</p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-medium",
            BAND_STYLE[score.band]
          )}
        >
          {BAND_LABEL[score.band]}
        </span>
      </div>

      {/* The reason, always — a band on its own is a verdict the reader cannot check. */}
      <p className="mt-1.5 text-sm text-muted-foreground">{score.reason}</p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          CTR <span className="font-medium text-foreground">{score.ctr.toFixed(2)}%</span>
        </span>
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
