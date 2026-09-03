"use client";
import { useMemo } from "react";
import { Flame } from "lucide-react";
import type { Recommendation } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useFatigue } from "@/lib/hooks/useFatigue";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { CreativeRow } from "@/components/fatigue/CreativeRow";
import { RULE_TEXT, bySeverity } from "@/components/fatigue/fatigue";

/**
 * `fatigueAlertRecommendation` titles an alert `Refresh creative: "<name>"`, which is the only
 * link between a stored alert and the creative it is about — there is no creative id on the
 * recommendation. Parsed rather than matched loosely, so a creative whose name contains a quote
 * cannot silently attach to the wrong row.
 */
function creativeNameFromAlert(title: string): string | null {
  const m = /^Refresh creative: "(.+)"$/.exec(title);
  return m?.[1] ?? null;
}

export default function FatigueMonitorPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: fatigue } = useFatigue(workspaceId);
  const { data: recs } = useRecommendations(workspaceId);

  const creatives = useMemo(
    () => [...(fatigue?.data ?? [])].sort(bySeverity),
    [fatigue]
  );

  /** Open alerts keyed by the creative they name. */
  const alertByCreative = useMemo(() => {
    const out = new Map<string, Recommendation>();
    for (const r of recs?.data ?? []) {
      if (r.type !== "fatigue_alert") continue;
      if (r.status === "dismissed") continue;
      const name = creativeNameFromAlert(r.title);
      if (name) out.set(name, r);
    }
    return out;
  }, [recs]);

  /**
   * Alerts whose creative is no longer in the live read.
   *
   * `ensureFatigueAlerts` is one-shot per workspace: it writes alerts on first load and never runs
   * again, while the fatigue read recomputes every time. So an alert can outlive the creative it
   * was raised for. Previously those alerts were the *entire* top section and nothing indicated
   * they were stale; now they are named as such rather than presented as current.
   */
  const orphaned = useMemo(() => {
    const live = new Set(creatives.map((c) => c.name));
    return [...alertByCreative.entries()].filter(([name]) => !live.has(name));
  }, [alertByCreative, creatives]);

  const needsAttention = creatives.filter((c) => c.status !== "healthy").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Creative Fatigue</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Meta creatives losing their audience. {RULE_TEXT}
          </p>
        </div>
        {fatigue && <DataSourceBadge source={fatigue.source} platform={MODULE_PLATFORMS.fatigue} />}
      </header>

      {fatigue && creatives.length > 0 && (
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
          {needsAttention === 0 ? (
            <>All {creatives.length} creatives within range</>
          ) : (
            <>
              <span className="text-foreground/80">{needsAttention}</span> of {creatives.length}{" "}
              need attention
            </>
          )}
        </p>
      )}

      {!fatigue || !recs ? (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y">
            {[0, 1, 2].map((i) => (
              <li key={i} className="space-y-3 px-5 py-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </li>
            ))}
          </ul>
        </Card>
      ) : creatives.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Flame className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No creatives to monitor</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Connect Meta Ads to start tracking frequency and click-through decline across your
            running creatives.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y">
            {creatives.map((c) => (
              <CreativeRow
                key={c.name}
                creative={c}
                alert={alertByCreative.get(c.name)}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
        </Card>
      )}

      {orphaned.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Alerts without a matching creative
          </h2>
          <Card className="space-y-2 border-dashed p-5">
            <p className="text-sm text-muted-foreground">
              These were raised earlier and the creative behind them is no longer in the latest
              read — it may have been renamed or stopped.
            </p>
            <ul className="space-y-1">
              {orphaned.map(([name, alert]) => (
                <li key={alert.id} className="text-sm font-medium">
                  {name}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
