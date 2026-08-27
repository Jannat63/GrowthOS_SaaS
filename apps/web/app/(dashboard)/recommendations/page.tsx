"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, Inbox } from "lucide-react";
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
import { RecommendationRow } from "@/components/recommendations/RecommendationRow";
import { BANDS, bandOf, type BandKey } from "@/components/recommendations/priority";
import { cn } from "@/lib/utils/cn";

/**
 * The three views are a real partition of the four statuses — `pending`, `snoozed`, and
 * `acted`+`dismissed`. The previous set (Open / Assigned / All) was not: "Assigned" cut across the
 * other two, so the chips read as a segmented control whose counts could not add up (14 / 2 / 15),
 * and "Open" included snoozed rows, which is why snoozing something appeared to do nothing.
 *
 * Assignment is genuinely orthogonal to status, so it is a separate toggle rather than a fourth tab.
 */
type View = "open" | "snoozed" | "done";

const VIEWS: { key: View; label: string; empty: string }[] = [
  {
    key: "open",
    label: "Open",
    empty: "Nothing open. New recommendations appear as channel data changes.",
  },
  {
    key: "snoozed",
    label: "Snoozed",
    empty: "Nothing snoozed. Snoozed recommendations return here on their date.",
  },
  {
    key: "done",
    label: "Done",
    empty: "Nothing finished yet. Acted and dismissed recommendations collect here.",
  },
];

const inView = (r: Recommendation, v: View) =>
  v === "open"
    ? r.status === "pending"
    : v === "snoozed"
      ? r.status === "snoozed"
      : r.status === "acted" || r.status === "dismissed";

export default function RecommendationsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const myUserId = me?.data.user.id ?? null;

  const { data: recs } = useRecommendations(workspaceId);
  const { data: members } = useMembers(workspaceId);
  const [view, setView] = useState<View>("open");
  const [mineOnly, setMineOnly] = useState(false);

  const all = useMemo(() => recs?.data ?? [], [recs]);

  const visible = useMemo(
    () =>
      all.filter(
        (r) => inView(r, view) && (!mineOnly || (myUserId !== null && r.assignedTo === myUserId))
      ),
    [all, view, mineOnly, myUserId]
  );

  // Grouped rather than ranked — see components/recommendations/priority.ts for why a flat
  // descending list overstates what the scores actually distinguish.
  const bands = useMemo(() => {
    const map = new Map<BandKey, Recommendation[]>();
    for (const r of visible) {
      const k = bandOf(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return map;
  }, [visible]);

  // Counted within the active view, so the badge matches what toggling it will actually leave on
  // screen. Counted across all views for the *visibility* check, so the control cannot unmount
  // while it is switched on — which would leave the filter silently applied with nothing to undo it.
  const mineInView = myUserId
    ? all.filter((r) => inView(r, view) && r.assignedTo === myUserId).length
    : 0;
  const hasAnyAssignedToMe = myUserId
    ? all.some((r) => r.assignedTo === myUserId)
    : false;

  // The API caps a page at 100 rows and returns the queue's real size. Reporting the page as the
  // whole queue would be a quiet lie on any workspace that outgrows one page.
  const truncated = recs ? recs.total > all.length : false;

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Recommendations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every cross-channel move worth making, grouped by priority. Assign an owner, discuss
            it, then act.
          </p>
        </div>
        {recs && <DataSourceBadge source={recs.source} platform={MODULE_PLATFORMS.crossChannel} />}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => {
          const count = all.filter((r) => inView(r, v.key)).length;
          return (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                view === v.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/60"
              )}
            >
              {v.label}
              <Badge variant="muted" className="px-1.5 py-0 tabular-nums">
                {count}
              </Badge>
            </button>
          );
        })}

        {(hasAnyAssignedToMe || mineOnly) && (
          <button
            onClick={() => setMineOnly((v) => !v)}
            aria-pressed={mineOnly}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              mineOnly
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary/60"
            )}
          >
            Assigned to me
            <Badge variant="muted" className="px-1.5 py-0 tabular-nums">
              {mineInView}
            </Badge>
          </button>
        )}
      </div>

      {truncated && (
        <p className="text-xs text-muted-foreground">
          Showing the first {all.length} of {recs!.total} recommendations.
        </p>
      )}

      {!recs ? (
        <QueueSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          view={view}
          mineOnly={mineOnly}
          message={VIEWS.find((v) => v.key === view)!.empty}
        />
      ) : (
        <div className="space-y-6">
          {BANDS.map((band) => {
            const rows = bands.get(band.key) ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={band.key} aria-labelledby={`band-${band.key}`}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2
                    id={`band-${band.key}`}
                    className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {band.label}
                    <span className="ml-2 text-foreground/60 tabular-nums">{rows.length}</span>
                  </h2>
                  {/* The rule is printed rather than implied — a band the reader can't verify is
                      just an unexplained reordering. */}
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                    {band.rule}
                  </span>
                </div>
                <Card className="overflow-hidden p-0">
                  <ul className="divide-y">
                    {rows.map((rec) => (
                      <RecommendationRow
                        key={rec.id}
                        rec={rec}
                        workspaceId={workspaceId}
                        members={members?.data ?? []}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  view,
  mineOnly,
  message,
}: {
  view: View;
  mineOnly: boolean;
  message: string;
}) {
  const Icon = view === "done" ? CheckCircle2 : Inbox;
  return (
    <Card className="border-dashed p-10 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">
        {mineOnly ? "Nothing assigned to you here" : "Nothing here right now"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {mineOnly ? "Clear the filter to see the rest of the queue." : message}
      </p>
    </Card>
  );
}

/** Mirrors the loaded layout — a banded list, not one block — so arrival isn't a layout jump. */
function QueueSkeleton() {
  return (
    <div className="space-y-6">
      {[3, 2].map((rows, i) => (
        <div key={i}>
          <Skeleton className="mb-2 h-4 w-28" />
          <Card className="overflow-hidden p-0">
            <ul className="divide-y">
              {Array.from({ length: rows }).map((_, j) => (
                <li key={j} className="space-y-2 px-5 py-4">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ))}
    </div>
  );
}
