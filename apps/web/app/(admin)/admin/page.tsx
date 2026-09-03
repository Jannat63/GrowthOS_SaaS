"use client";
import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, PlugZap, XCircle } from "lucide-react";
import type {
  FailedJobItem,
  PastDueItem,
  StaleConnectionItem,
  TrialEndingItem,
} from "@growthos/types";
import { channelLabel } from "@growthos/logic";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { absoluteTime, daysSince, daysUntil, relativeTime } from "@/lib/utils/time";
import { useAdminOverview } from "@/lib/hooks/useAdmin";
import { countLabel, moneyLabel, planLabel } from "@/components/admin/labels";
import { spineClass, toneTextClass, trialTone, type Tone } from "@/components/admin/tone";

/**
 * The console's front page.
 *
 * It used to be two large numbers, a plan bar and one alert — four facts in a full screen, none of
 * which told an operator what to do next. This leads with the work instead: the accounts that need
 * a person today, each one a link to the file where you would act on it. The platform totals moved
 * below, into a single divided line, because they are context for the queue rather than the point
 * of the page.
 *
 * When nothing needs attention the page is short and says so. That is a good day, not an empty
 * state to apologise for.
 */
export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();
  const a = data?.attention;

  const total =
    (a?.pastDueTotal ?? 0) +
    (a?.trialsEndingTotal ?? 0) +
    (a?.staleConnectionsTotal ?? 0) +
    (a?.failedJobsTotal ?? 0);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-xl font-semibold tracking-tight">Overview</h1>

      <section aria-labelledby="needs-you">
        <div className="flex items-baseline justify-between gap-4 border-b pb-2">
          <h2 id="needs-you" className="font-display text-base font-semibold tracking-tight">
            Needs you
          </h2>
          {!isLoading && total > 0 && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {countLabel(total, "item")}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 pt-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : total === 0 ? (
          <p className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            No accounts need attention. No payments are late, no trial ends in the next three days,
            every integration has synced this week, and nothing has failed.
          </p>
        ) : (
          <div className="divide-y">
            {a?.pastDue.map((item) => <PastDueRow key={item.workspaceId} item={item} />)}
            <More shown={a?.pastDue.length ?? 0} total={a?.pastDueTotal ?? 0} noun="late payment" />

            {a?.trialsEnding.map((item) => <TrialRow key={item.workspaceId} item={item} />)}
            <More shown={a?.trialsEnding.length ?? 0} total={a?.trialsEndingTotal ?? 0} noun="trial" />

            {a?.staleConnections.map((item) => (
              <ConnectionRow key={`${item.workspaceId}-${item.platform}`} item={item} />
            ))}
            <More
              shown={a?.staleConnections.length ?? 0}
              total={a?.staleConnectionsTotal ?? 0}
              noun="quiet connection"
            />

            {a?.failedJobs.map((item) => <JobRow key={item.jobId} item={item} />)}
            <More shown={a?.failedJobs.length ?? 0} total={a?.failedJobsTotal ?? 0} noun="failed job" />
          </div>
        )}
      </section>

      <section aria-labelledby="platform">
        <h2 id="platform" className="sr-only">
          Platform totals
        </h2>

        {/*
          A divided line, not four cards. These are four readings of one instrument, and giving each
          its own bordered box implies they are four separate things you might act on — which is
          the opposite of true now that the things you act on are in the queue above.
        */}
        <dl className="grid grid-cols-2 divide-x divide-y rounded-lg border sm:grid-cols-4 sm:divide-y-0">
          <Figure label="Workspaces" value={data?.totalWorkspaces} loading={isLoading} />
          <Figure label="People" value={data?.totalUsers} loading={isLoading} />
          <Figure
            label="Monthly revenue"
            value={data ? moneyLabel(data.mrrCents) : undefined}
            loading={isLoading}
            hint="Active subscriptions at list price. Trials and late payments are not counted."
          />
          <Figure label="New this week" value={data?.signupsLast7d} loading={isLoading} />
        </dl>

        <PlanMix rows={data?.workspacesByPlan ?? []} loading={isLoading} />
      </section>
    </div>
  );
}

// ── The queue ────────────────────────────────────────────────────────────────

/**
 * One line of work. The row is the link — the whole thing, not just the name — because in a list
 * you aim at the row, and a 200px click target beats a 90px one every time.
 */
function Row({
  href,
  tone,
  icon: Icon,
  name,
  what,
  trailing,
}: {
  href: string;
  tone: Tone;
  icon: typeof Clock;
  name: string;
  what: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 border-l-2 py-2.5 pl-3 pr-2 transition-colors hover:bg-secondary/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        spineClass(tone)
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", toneTextClass(tone))}
        aria-hidden="true"
      />
      <span className="min-w-0 shrink-0 basis-56 truncate text-sm font-medium">{name}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{what}</span>
      {trailing && (
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {trailing}
        </span>
      )}
    </Link>
  );
}

function PastDueRow({ item }: { item: PastDueItem }) {
  return (
    <Row
      href={`/admin/workspaces/${item.workspaceId}`}
      tone="broken"
      icon={CreditCard}
      name={item.workspaceName}
      what={
        <>
          Payment failed{" "}
          <span title={absoluteTime(item.since)}>{relativeTime(item.since)}</span>
        </>
      }
      trailing={planLabel(item.plan)}
    />
  );
}

function TrialRow({ item }: { item: TrialEndingItem }) {
  const left = daysUntil(item.trialEndsAt);
  return (
    <Row
      href={`/admin/workspaces/${item.workspaceId}`}
      tone={trialTone(left)}
      icon={Clock}
      name={item.workspaceName}
      what={
        <span title={absoluteTime(item.trialEndsAt)}>
          {left !== null && left < 0
            ? `Trial lapsed ${relativeTime(item.trialEndsAt)} — the workspace is read-only`
            : `Trial ends ${relativeTime(item.trialEndsAt)}`}
        </span>
      }
      trailing={planLabel(item.plan)}
    />
  );
}

function ConnectionRow({ item }: { item: StaleConnectionItem }) {
  const quietFor = daysSince(item.lastSyncedAt);
  return (
    <Row
      href={`/admin/workspaces/${item.workspaceId}`}
      tone={item.isActive ? "attention" : "broken"}
      icon={PlugZap}
      name={item.workspaceName}
      what={
        item.isActive ? (
          <span title={absoluteTime(item.lastSyncedAt)}>
            {/* Slugs never reach the screen — CLAUDE.md. */}
            {channelLabel(item.platform)} last synced {relativeTime(item.lastSyncedAt)}
          </span>
        ) : (
          <>{channelLabel(item.platform)} is disconnected</>
        )
      }
      trailing={quietFor !== null && item.isActive ? `${quietFor}d quiet` : undefined}
    />
  );
}

function JobRow({ item }: { item: FailedJobItem }) {
  return (
    <Row
      href={`/admin/workspaces/${item.workspaceId}`}
      tone="broken"
      icon={XCircle}
      name={item.workspaceName}
      what={
        <span title={item.error ?? undefined}>
          {item.type} failed{item.error ? ` — ${item.error}` : ""}
        </span>
      }
      trailing={relativeTime(item.failedAt)}
    />
  );
}

/** "and 40 more" — so a capped queue never reads as the whole truth. */
function More({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  if (total <= shown) return null;
  const rest = total - shown;
  return (
    <p className="border-l-2 border-l-transparent py-2 pl-10 text-xs text-muted-foreground">
      and {rest} more {rest === 1 ? noun : `${noun}s`}
    </p>
  );
}

// ── Platform totals ──────────────────────────────────────────────────────────

function Figure({
  label,
  value,
  loading,
  hint,
}: {
  label: string;
  value: number | string | undefined;
  loading: boolean;
  hint?: string;
}) {
  return (
    <div className="px-4 py-3.5" title={hint}>
      <dd className="font-mono text-2xl font-semibold tabular-nums">
        {loading ? <Skeleton className="h-8 w-20" /> : (value ?? "—")}
      </dd>
      <dt className="mt-0.5 text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

/** Plans are ordinal, so the split is one ramp rather than three unrelated colours. */
const PLAN_ORDER = ["starter", "growth", "scale"];
const PLAN_FILL: Record<string, string> = {
  starter: "bg-primary/25",
  growth: "bg-primary/55",
  scale: "bg-primary",
};

function PlanMix({
  rows,
  loading,
}: {
  rows: { plan: string; count: number }[];
  loading: boolean;
}) {
  const sorted = [...rows].sort(
    (x, y) => PLAN_ORDER.indexOf(x.plan) - PLAN_ORDER.indexOf(y.plan)
  );
  const total = sorted.reduce((n, r) => n + r.count, 0);

  if (loading) return <Skeleton className="mt-4 h-9 w-full" />;
  if (total === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        {sorted.map((r) => (
          <div
            key={r.plan}
            className={cn("h-full", PLAN_FILL[r.plan] ?? "bg-primary/25")}
            style={{ width: `${(r.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {sorted.map((r) => (
          <li key={r.plan} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className={cn("h-2 w-2 rounded-full", PLAN_FILL[r.plan] ?? "bg-primary/25")}
            />
            <span className="text-muted-foreground">{planLabel(r.plan)}</span>
            <span className="font-mono tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
