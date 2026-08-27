"use client";
import { Check, MoreHorizontal, X } from "lucide-react";
import type { Recommendation, ScoredCreative } from "@growthos/types";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@growthos/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@growthos/ui/components/tooltip";
import { cn } from "@/lib/utils/cn";
import {
  useRecommendationActions,
  toastUndoableDismiss,
  snoozeUntil,
} from "@/lib/hooks/useRecommendationActions";
import {
  FATIGUE_THRESHOLDS,
  breaches,
  ctrMovement,
  heldByAlertWindow,
} from "./fatigue";

const STATUS: Record<
  ScoredCreative["status"],
  { label: string; variant: "destructive" | "warning" | "muted" }
> = {
  // Rose, not ember. Ember is the action colour, and a fatigued creative is a problem, not a
  // button — the old mapping put "Fatigued" in the same tone as every primary control on screen.
  fatigued: { label: "Fatigued", variant: "destructive" },
  "at-risk": { label: "At risk", variant: "warning" },
  healthy: { label: "Healthy", variant: "muted" },
};

/**
 * One creative, with the evidence that produced its verdict and — when it has an open alert — the
 * actions for it.
 *
 * The page used to run two lists: "Refresh alerts" from the recommendation queue and "All
 * creatives" from the live fatigue read. The same creative appeared in both with the same sentence,
 * nothing connected the two, and only one of them carried a provenance badge. Worse, the alerts are
 * generated once per workspace and never regenerated, while the grid recomputes on every load — so
 * the two drift apart as soon as a creative's numbers move.
 */
export function CreativeRow({
  creative,
  alert,
  workspaceId,
}: {
  creative: ScoredCreative;
  /** The open fatigue_alert for this creative, if one exists. */
  alert: Recommendation | undefined;
  workspaceId: string | null;
}) {
  // Per row, so acting on one alert cannot disable the buttons on the others.
  const actions = useRecommendationActions(workspaceId);

  const move = ctrMovement(creative);
  const over = breaches(creative);
  const held = heldByAlertWindow(creative);
  const status = STATUS[creative.status];

  return (
    <li
      className={cn(
        "px-5 py-4",
        creative.status === "healthy" && "opacity-75"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{creative.name}</h3>
            <Badge variant={status.variant}>{status.label}</Badge>
            {alert?.status === "snoozed" && <Badge variant="muted">Snoozed</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{creative.message}</p>
          {held && <p className="mt-1 text-xs text-muted-foreground">{held}</p>}
        </div>

        {alert && alert.status !== "acted" && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              className="h-8"
              onClick={() => actions.mutate({ id: alert.id, status: "acted" })}
            >
              <Check className="h-4 w-4" />
              Refreshed
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground"
                  aria-label={`More actions for ${creative.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Remind me</DropdownMenuLabel>
                {[
                  { label: "Tomorrow", days: 1 },
                  { label: "In three days", days: 3 },
                ].map((o) => (
                  <DropdownMenuItem
                    key={o.days}
                    onClick={() =>
                      actions.mutate({
                        id: alert.id,
                        status: "snoozed",
                        snoozedUntil: snoozeUntil(o.days),
                      })
                    }
                  >
                    {o.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    actions.mutate({ id: alert.id, status: "dismissed" });
                    toastUndoableDismiss(alert.title, () =>
                      actions.mutate({ id: alert.id, status: "pending" })
                    );
                  }}
                >
                  <X className="h-4 w-4" />
                  Ignore
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* The evidence, each value shown against the line it is being judged on. */}
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <Measure
          label="Frequency"
          value={creative.frequency.toFixed(1)}
          threshold={`limit ${FATIGUE_THRESHOLDS.frequency.toFixed(1)}`}
          fraction={creative.frequency / (FATIGUE_THRESHOLDS.frequency * 2)}
          breached={over.includes("frequency")}
          hint={`Average times one person has seen this ad. Over ${FATIGUE_THRESHOLDS.frequency} means the audience is seeing it too often.`}
        />
        <Measure
          label="CTR week over week"
          // Both weeks, because the decline is meaningless without the figure it fell from — and
          // `ctrLastWeek` was in the API response all along without ever being rendered.
          value={`${creative.ctrLastWeek.toFixed(2)}% → ${creative.ctrThisWeek.toFixed(2)}%`}
          threshold={`${move.label}${
            move.direction === "down" ? ` · limit ${FATIGUE_THRESHOLDS.ctrDecline}%` : ""
          }`}
          fraction={
            move.direction === "down"
              ? move.magnitude / (FATIGUE_THRESHOLDS.ctrDecline * 2)
              : 0
          }
          breached={over.includes("ctrDecline")}
          hint={`Click-through rate this week against last week. A fall of more than ${FATIGUE_THRESHOLDS.ctrDecline}% is the second fatigue signal.`}
          tone={move.direction === "up" ? "good" : undefined}
        />
        <Measure
          label="Running for"
          value={`${Math.round(creative.hoursSinceLaunch)}h`}
          threshold={
            creative.hoursSinceLaunch >= FATIGUE_THRESHOLDS.alertWindowHours
              ? "past the alert window"
              : `judged after ${FATIGUE_THRESHOLDS.alertWindowHours}h`
          }
          fraction={creative.hoursSinceLaunch / (FATIGUE_THRESHOLDS.alertWindowHours * 2)}
          breached={false}
          hint={`A creative is not judged on one bad signal until it has run ${FATIGUE_THRESHOLDS.alertWindowHours} hours.`}
        />
      </dl>
    </li>
  );
}

/**
 * A measurement against the line it is judged on.
 *
 * The old cards printed "Freq 4.2  CTR 1.8%  Δ 31%" — three bare numbers with no thresholds, so
 * the verdict beside them could only be taken on trust. The bar is scaled to twice the threshold so
 * the line sits at the midpoint and is legible as a position rather than a value.
 */
function Measure({
  label,
  value,
  threshold,
  fraction,
  breached,
  hint,
  tone,
}: {
  label: string;
  value: string;
  threshold: string;
  fraction: number;
  breached: boolean;
  hint: string;
  tone?: "good";
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <dt className="cursor-help font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </dt>
        </TooltipTrigger>
        <TooltipContent className="max-w-[16rem]">{hint}</TooltipContent>
      </Tooltip>
      <dd className="mt-0.5 flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            breached && "text-destructive",
            tone === "good" && "text-success"
          )}
        >
          {value}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{threshold}</span>
      </dd>
      <div className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full",
            breached ? "bg-destructive" : tone === "good" ? "bg-success" : "bg-muted-foreground/40"
          )}
          style={{ width: `${clamped * 100}%` }}
        />
        {/* The threshold itself, at the midpoint of the scale. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px bg-foreground/30"
        />
      </div>
    </div>
  );
}
