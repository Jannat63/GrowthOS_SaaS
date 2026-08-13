"use client";
import { useState } from "react";
import type { Recommendation } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useMembers } from "@/lib/hooks/useMembers";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { cn } from "@/lib/utils/cn";

type Filter = "open" | "assigned" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "assigned", label: "Assigned" },
  { key: "all", label: "All" },
];

export default function RecommendationsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: recs } = useRecommendations(workspaceId);
  const { data: members } = useMembers(workspaceId);
  const [filter, setFilter] = useState<Filter>("open");

  const all = recs?.data ?? [];
  const visible = all.filter((r: Recommendation) => {
    if (filter === "open") return r.status === "pending" || r.status === "snoozed";
    if (filter === "assigned") return Boolean(r.assignedTo);
    return true;
  });

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Recommendations</h1>
          <p className="text-sm text-muted-foreground">
            Your unified growth queue — assign owners, discuss, and act as a team.
          </p>
        </div>
        {recs && <DataSourceBadge source={recs.source} platform={MODULE_PLATFORMS.crossChannel} />}
      </div>

      <div className="flex items-center gap-2">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? all.length
              : f.key === "assigned"
                ? all.filter((r) => r.assignedTo).length
                : all.filter((r) => r.status === "pending" || r.status === "snoozed").length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                filter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/60"
              )}
            >
              {f.label}
              <Badge variant="muted" className="px-1.5 py-0 tabular-nums">
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {!recs ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed p-8 text-center">
          <p className="text-sm font-medium">Nothing here right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "assigned"
              ? "No recommendations are assigned yet."
              : "You're all caught up — new recommendations will appear here."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((rec: Recommendation) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              workspaceId={workspaceId}
              members={members?.data ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
