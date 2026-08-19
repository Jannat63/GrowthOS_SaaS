"use client";
import { Check, X, Clock, Flame } from "lucide-react";
import type { ScoredCreative } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useFatigue } from "@/lib/hooks/useFatigue";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useRecommendationActions } from "@/lib/hooks/useRecommendationActions";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";

const STATUS: Record<
  ScoredCreative["status"],
  { label: string; variant: "default" | "muted" | "outline" }
> = {
  fatigued: { label: "Fatigued", variant: "default" },
  "at-risk": { label: "At risk", variant: "muted" },
  healthy: { label: "Healthy", variant: "outline" },
};

export default function FatigueMonitorPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: fatigue } = useFatigue(workspaceId);
  const { data: recs } = useRecommendations(workspaceId);
  const actions = useRecommendationActions(workspaceId);

  const alerts = (recs?.data ?? []).filter(
    (r) => r.type === "fatigue_alert" && r.status === "pending"
  );

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Creative Fatigue</h1>
        <p className="text-sm text-muted-foreground">
          Meta creatives approaching fatigue (frequency &gt; 3 and CTR down &gt; 20% WoW).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Refresh alerts</h2>
        {!recs ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : alerts.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm font-medium">No fatigue alerts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Creatives are performing within range. Alerts appear as fatigue is detected.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((rec) => (
              <Card key={rec.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Flame className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{rec.body}</p>
                    </div>
                  </div>
                  <Badge variant="muted">Urgency {rec.urgencyScore}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" onClick={() => actions.mutate({ id: rec.id, status: "acted" })} disabled={actions.isPending}>
                    <Check className="h-4 w-4" /> Refreshed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => actions.mutate({ id: rec.id, status: "snoozed" })} disabled={actions.isPending}>
                    <Clock className="h-4 w-4" /> Snooze
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => actions.mutate({ id: rec.id, status: "dismissed" })} disabled={actions.isPending}>
                    <X className="h-4 w-4" /> Ignore
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">All creatives</h2>
          {fatigue && <DataSourceBadge source={fatigue.source} platform={MODULE_PLATFORMS.fatigue} />}
        </div>
        {fatigue ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {fatigue.data.map((c) => {
              const s = STATUS[c.status];
              return (
                <Card key={c.name} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.name}</p>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.message}</p>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground tabular-nums">
                    <span>Freq {c.frequency.toFixed(1)}</span>
                    <span>CTR {c.ctrThisWeek.toFixed(1)}%</span>
                    <span>Δ {c.ctrDeclinePercent.toFixed(0)}%</span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Skeleton className="h-40 w-full rounded-lg" />
        )}
      </section>
    </div>
  );
}
