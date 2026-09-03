"use client";
import { Building2, Users, Clock } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useAdminHealth } from "@/lib/hooks/useAdmin";

/** Plans are ordinal, so the split is drawn as one ramp rather than three unrelated colours. */
const PLAN_ORDER = ["starter", "growth", "scale"];
const PLAN_FILL: Record<string, string> = {
  starter: "bg-primary/30",
  growth: "bg-primary/60",
  scale: "bg-primary",
};

export default function AdminOverviewPage() {
  const { data: health, isLoading } = useAdminHealth();

  const byPlan = [...(health?.workspacesByPlan ?? [])].sort(
    (a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan)
  );
  const planTotal = byPlan.reduce((n, r) => n + r.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every workspace on the platform, counted together.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Figure
          icon={Building2}
          label="Workspaces"
          value={health?.totalWorkspaces}
          loading={isLoading}
        />
        <Figure icon={Users} label="People" value={health?.totalUsers} loading={isLoading} />
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Plan mix</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {/*
            The old card listed plan counts as plain rows under a pie-chart icon — an icon
            promising a shape the card never drew, next to numbers whose one interesting property
            (that they are shares of the workspace total above) was invisible. A single stacked bar
            says the same thing and shows the proportion for free.
          */}
          How the {planTotal} {planTotal === 1 ? "workspace" : "workspaces"} above are distributed.
        </p>

        {isLoading ? (
          <Skeleton className="mt-5 h-24 w-full" />
        ) : planTotal === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No workspaces yet. The split appears once the first one is created.
          </p>
        ) : (
          <>
            <div
              className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary"
              role="img"
              aria-label={byPlan
                .map((r) => `${r.plan}: ${r.count} of ${planTotal}`)
                .join(", ")}
            >
              {byPlan.map((row) => (
                <span
                  key={row.plan}
                  className={cn(PLAN_FILL[row.plan] ?? "bg-muted-foreground/40")}
                  style={{ width: `${(row.count / planTotal) * 100}%` }}
                />
              ))}
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-3">
              {byPlan.map((row) => (
                <div key={row.plan} className="flex items-baseline gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2 w-2 shrink-0 translate-y-[-1px] rounded-full",
                      PLAN_FILL[row.plan] ?? "bg-muted-foreground/40"
                    )}
                  />
                  <dt className="text-sm capitalize text-muted-foreground">{row.plan}</dt>
                  <dd className="ml-auto font-mono text-sm tabular-nums">
                    {row.count}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {Math.round((row.count / planTotal) * 100)}%
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </Card>

      {/*
        Trials ending soon is the one figure here that is a queue rather than a measurement — it
        asks someone to do something. It sat as a third identical stat tile, which is why it read
        as trivia. It now only appears when there is something in it.
      */}
      {!isLoading && (health?.trialsEndingSoonCount ?? 0) > 0 && (
        <Card className="flex items-start gap-3 border-warning/30 bg-warning/5 p-5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">
              {health!.trialsEndingSoonCount}{" "}
              {health!.trialsEndingSoonCount === 1 ? "trial ends" : "trials end"} in the next three
              days
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Each becomes read-only when it lapses. Open the workspace to override a plan if one
              needs more time.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Figure({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Building2;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-16" />
      ) : (
        <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value ?? "—"}</p>
      )}
    </Card>
  );
}
