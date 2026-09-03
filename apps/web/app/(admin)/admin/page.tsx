"use client";
import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, PlugZap, XCircle } from "lucide-react";
import type {
  FailedJobItem,
  PastDueItem,
  PlatformOverview,
  StaleConnectionItem,
  TrialEndingItem,
} from "@growthos/types";
import { channelLabel } from "@growthos/logic";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { absoluteTime, daysSince, daysUntil, relativeTime } from "@/lib/utils/time";
import { useAdminOverview } from "@/lib/hooks/useAdmin";
import {
  countLabel,
  moneyLabel,
  planLabel,
  subscriptionStatusLabel,
} from "@/components/admin/labels";
import { spineClass, toneTextClass, trialTone, type Tone } from "@/components/admin/tone";
import {
  BarList,
  ChannelSpark,
  ReturnLine,
  SignupBars,
  SpendArea,
  compact,
} from "@/components/admin/OverviewCharts";

/**
 * The console's front page.
 *
 * It answers four questions, in the order an operator asks them: does anything need me, is the
 * business growing, is the platform working, and how much is actually flowing through it. The
 * first version answered one and a half — a short queue, four figures, and then most of a 1920px
 * screen of nothing.
 *
 * **The hero is platform-wide ad spend**, and it sits beside the funnel it came from rather than
 * stretching the full width. That is the characteristic number for this product: GrowthOS exists to
 * optimise money customers spend elsewhere, so the amount moving through it says more about the
 * platform than its own revenue does.
 *
 * Structurally the page uses two devices and no card kit: rows with a state spine for anything that
 * is a queue, and bordered containers divided by rules for anything that is a set of readings.
 * Identical rounded cards for every block is what made the original panel read as a different
 * product wearing our logo.
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
    <div className="space-y-6 pb-10">
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

      <VitalSigns data={data} loading={isLoading} />
      <SpendBand data={data} loading={isLoading} />

      {/* The channel split, as small multiples rather than a stack. */}
      {data && data.spendByChannelDaily.length > 0 && (
        <div className="grid divide-y rounded-lg border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <ChannelSpark
            data={data.spendByChannelDaily}
            channel="google"
            total={data.spendByPlatform.find((p) => p.platform === "google_ads")?.spend ?? 0}
          />
          <ChannelSpark
            data={data.spendByChannelDaily}
            channel="meta"
            total={data.spendByPlatform.find((p) => p.platform === "meta_ads")?.spend ?? 0}
          />
        </div>
      )}

      <div className="grid divide-y rounded-lg border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <ReturnPanel data={data} loading={isLoading} />
        <OutcomesPanel data={data} loading={isLoading} />
      </div>

      <div className="grid divide-y rounded-lg border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <SubscriptionsPanel data={data} loading={isLoading} />
        <GrowthPanel data={data} loading={isLoading} />
        <CampaignsPanel data={data} loading={isLoading} />
      </div>

      <div className="grid divide-y rounded-lg border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <NewestAccounts data={data} loading={isLoading} />
        <TopSpenders data={data} loading={isLoading} />
      </div>
    </div>
  );
}

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

// ── Vital signs ──────────────────────────────────────────────────────────────

function VitalSigns({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-y rounded-lg border sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
      <Figure label="Workspaces" value={data?.totalWorkspaces} loading={loading} />
      <Figure label="People" value={data?.totalUsers} loading={loading} />
      <Figure
        label="Monthly revenue"
        value={data ? moneyLabel(data.mrrCents) : undefined}
        loading={loading}
        hint="Active subscriptions at list price. Trials and late payments are not counted."
      />
      <Figure
        label="New this week"
        value={data?.signupsLast7d}
        loading={loading}
        hint="People who signed up in the last seven days."
      />
      <Figure
        label="Signed in now"
        value={data?.liveSessions}
        loading={loading}
        hint="Distinct people with a session that has not expired."
      />
      <Figure
        label="Recommendations"
        value={data?.recommendationsGenerated}
        loading={loading}
        hint="Everything the product has generated for customers, ever."
      />
    </dl>
  );
}

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

// ── The hero, beside the funnel it came from ─────────────────────────────────

function SpendBand({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  if (loading) return <Skeleton className="h-72 w-full" />;
  if (!data || data.spendDaily.length === 0) {
    return (
      <section className="rounded-lg border p-5">
        <h2 className="font-display text-base font-semibold tracking-tight">
          Money moving through GrowthOS
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          No advertising data yet. This fills in once a workspace connects Google or Meta and the
          first sync lands.
        </p>
      </section>
    );
  }

  const ctr = data.funnel.impressions > 0 ? (data.funnel.clicks / data.funnel.impressions) * 100 : 0;
  const cpc = data.funnel.clicks > 0 ? data.totalSpend / data.funnel.clicks : 0;
  const cpa = data.funnel.conversions > 0 ? data.totalSpend / data.funnel.conversions : 0;

  return (
    <section
      className="grid divide-y rounded-lg border lg:grid-cols-[2fr_1fr] lg:divide-x lg:divide-y-0"
      aria-labelledby="spend"
    >
      <div className="min-w-0 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="spend" className="font-display text-base font-semibold tracking-tight">
            Money moving through GrowthOS
          </h2>
          <p className="font-mono text-sm tabular-nums">
            {moneyLabel(data.totalSpend * 100)}
            <span className="ml-2 text-xs text-muted-foreground">
              {data.spendWindow.from} to {data.spendWindow.to}
            </span>
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Every customer&rsquo;s advertising spend, added together. Not our revenue — the money they
          run through the product.
        </p>
        <div className="mt-4">
          <SpendArea data={data.spendDaily} />
        </div>
      </div>

      {/*
        The funnel that spend bought, as a rail. Ordered the way the money travels — shown, clicked,
        converted, earned — so it reads as one chain rather than four unrelated counters.
      */}
      <div className="min-w-0 p-5">
        <h3 className="font-display text-sm font-semibold tracking-tight">What it bought</h3>
        <dl className="mt-3 divide-y">
          <Reading label="Impressions" value={compact(data.funnel.impressions)} />
          <Reading label="Clicks" value={compact(data.funnel.clicks)} note={`${ctr.toFixed(2)}% CTR`} />
          <Reading
            label="Conversions"
            value={compact(data.funnel.conversions)}
            note={cpa > 0 ? `${moneyLabel(cpa * 100)} each` : undefined}
          />
          <Reading
            label="Attributed revenue"
            value={moneyLabel(data.funnel.revenue * 100)}
            note={
              data.totalSpend > 0
                ? `${(data.funnel.revenue / data.totalSpend).toFixed(1)}x return`
                : undefined
            }
          />
          <Reading label="Cost per click" value={cpc > 0 ? moneyLabel(cpc * 100) : "—"} />
        </dl>
      </div>
    </section>
  );
}

function Reading({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <span className="font-mono text-sm tabular-nums">{value}</span>
        {note && <span className="ml-2 text-xs text-muted-foreground">{note}</span>}
      </dd>
    </div>
  );
}

// ── Panels ───────────────────────────────────────────────────────────────────

function ReturnPanel({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  const ratio =
    data && data.totalSpend > 0 ? (data.funnel.revenue / data.totalSpend).toFixed(2) : null;
  return (
    <Panel
      title="Return on that spend"
      aside={ratio && <span className="font-mono text-xs tabular-nums">{ratio}x</span>}
    >
      {loading || !data ? (
        <Skeleton className="h-28 w-full" />
      ) : data.spendDaily.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to measure yet.</p>
      ) : (
        <>
          <ReturnLine data={data.spendDaily} />
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Attributed revenue divided by spend, for every customer together. It is the number the
            product exists to move.
          </p>
        </>
      )}
    </Panel>
  );
}

function OutcomesPanel({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  const total = data?.recommendationsByStatus.reduce((n, r) => n + r.count, 0) ?? 0;
  const acted = data?.recommendationsByStatus.find((r) => r.status === "acted")?.count ?? 0;

  return (
    <Panel
      title="What happens to our advice"
      aside={
        total > 0 && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {((acted / total) * 100).toFixed(0)}% acted on
          </span>
        )
      }
    >
      {loading || !data ? (
        <Skeleton className="h-28 w-full" />
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing generated yet. Recommendations appear once a workspace has data to work from.
        </p>
      ) : (
        <>
          <BarList
            tone="muted"
            rows={data.recommendationsByStatus
              .slice()
              .sort((x, y) => y.count - x.count)
              .map((r) => ({
                key: r.status,
                label: recommendationStatusLabel(r.status),
                value: String(r.count),
                share: (r.count / total) * 100,
              }))}
          />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Every recommendation the engine has produced, and where it ended up. A queue that stays
            pending is the product talking to itself.
          </p>
        </>
      )}
    </Panel>
  );
}

/** Storage slugs are not reading matter — same rule as `channelLabel`. */
function recommendationStatusLabel(status: string): string {
  const NAMES: Record<string, string> = {
    pending: "Still waiting",
    acted: "Acted on",
    dismissed: "Dismissed",
    snoozed: "Snoozed",
  };
  return NAMES[status] ?? status;
}

function SubscriptionsPanel({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  return (
    <Panel title="Subscriptions">
      {loading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="space-y-2">
          {data.subscriptionMix.map((row) => (
            <li key={row.status} className="flex items-baseline justify-between gap-4 text-sm">
              <span className={cn(row.status === "past_due" && "text-destructive")}>
                {subscriptionStatusLabel(row.status)}
              </span>
              <span className="font-mono tabular-nums">{row.count}</span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-4 border-t pt-2 text-sm">
            <span className="text-muted-foreground">Connected integrations</span>
            <span
              className={cn(
                "font-mono tabular-nums",
                data.connectedPlatforms === 0 && "text-warning"
              )}
            >
              {data.connectedPlatforms}
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Content briefs written</span>
            <span className="font-mono tabular-nums">{data.briefsCreated}</span>
          </li>
        </ul>
      )}
    </Panel>
  );
}

function GrowthPanel({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  const joined = data?.growthDaily.reduce((n, d) => n + d.users, 0) ?? 0;
  return (
    <Panel
      title="New people, per day"
      aside={
        data && <span className="font-mono text-xs tabular-nums text-muted-foreground">{joined}</span>
      }
    >
      {loading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          <SignupBars data={data.growthDaily} />
          <p className="mt-2 text-xs text-muted-foreground">
            Last 30 days. {joined} {joined === 1 ? "person" : "people"} joined.
          </p>
        </>
      )}
    </Panel>
  );
}

function CampaignsPanel({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  return (
    <Panel title="Biggest campaigns">
      {loading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : data.topCampaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing running yet.</p>
      ) : (
        <BarList
          rows={data.topCampaigns.map((c) => ({
            key: `${c.platform}-${c.campaign}`,
            label: c.campaign,
            // Slugs never reach the screen — CLAUDE.md.
            sub: channelLabel(c.platform),
            value: moneyLabel(c.spend * 100),
            share: data.totalSpend > 0 ? (c.spend / data.totalSpend) * 100 : 0,
          }))}
        />
      )}
    </Panel>
  );
}

function NewestAccounts({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  return (
    <Panel title="Newest accounts">
      {loading || !data ? (
        <Skeleton className="h-32 w-full" />
      ) : data.newestWorkspaces.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workspaces yet.</p>
      ) : (
        <ul className="divide-y">
          {data.newestWorkspaces.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-4 py-2">
              <Link
                href={`/admin/workspaces/${w.id}`}
                className="min-w-0 truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {w.name}
              </Link>
              <span className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>{planLabel(w.plan)}</span>
                <span title={absoluteTime(w.createdAt)}>{relativeTime(w.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TopSpenders({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  return (
    <Panel title="Biggest spenders">
      {loading || !data ? (
        <Skeleton className="h-32 w-full" />
      ) : data.topSpenders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No advertising data yet, so there is nothing to rank.
        </p>
      ) : (
        <ul className="divide-y">
          {data.topSpenders.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-4 py-2">
              <Link
                href={`/admin/workspaces/${w.id}`}
                className="min-w-0 truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {w.name}
              </Link>
              <span className="shrink-0 font-mono text-xs tabular-nums">
                {moneyLabel(w.spend * 100)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
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
      <Icon className={cn("h-4 w-4 shrink-0", toneTextClass(tone))} aria-hidden="true" />
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
          Payment failed <span title={absoluteTime(item.since)}>{relativeTime(item.since)}</span>
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
