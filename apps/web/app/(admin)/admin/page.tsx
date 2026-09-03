"use client";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

/**
 * The console's front page.
 *
 * It answers four questions, in the order an operator asks them: does anything need me, is the
 * business growing, is the platform working, and how much is actually flowing through it. The
 * first version answered one and a half — a short queue, four figures, and then most of a 1920px
 * screen of nothing.
 *
 * **The hero is platform-wide ad spend.** That is the characteristic number for this product:
 * GrowthOS exists to optimise money that customers spend elsewhere, so the amount moving through it
 * says more about the platform than its own revenue does. It was also the largest dataset in the
 * system — tens of thousands of rows in ClickHouse — with nothing on the console reading it.
 *
 * Structurally the page is built from two devices, not from a card kit: rows with a state spine for
 * anything that is a queue, and bordered containers divided by rules for anything that is a set of
 * readings. Identical rounded cards for every block is the thing that made the old admin panel
 * read as a different product wearing our logo.
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
    <div className="space-y-7 pb-10">
      <h1 className="font-display text-xl font-semibold tracking-tight">Overview</h1>

      {/* 1. What needs a person. */}
      <section aria-labelledby="needs-you">
        <SectionHead id="needs-you" title="Needs you">
          {!isLoading && total > 0 && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {countLabel(total, "item")}
            </span>
          )}
        </SectionHead>

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

      {/* 2. The readings. Six figures, divided rather than carded. */}
      <VitalSigns data={data} loading={isLoading} />

      {/* 3. The one bold thing. */}
      <SpendChart data={data} loading={isLoading} />

      {/* 4. Three readings that each need a shape, in one container. */}
      <div className="grid divide-y rounded-lg border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <Subscriptions data={data} loading={isLoading} />
        <GrowthChart data={data} loading={isLoading} />
        <ChannelSplit data={data} loading={isLoading} />
      </div>

      {/* 5. Two ways into an account. */}
      <div className="grid divide-y rounded-lg border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <NewestAccounts data={data} loading={isLoading} />
        <TopSpenders data={data} loading={isLoading} />
      </div>
    </div>
  );
}

function SectionHead({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b pb-2">
      <h2 id={id} className="font-display text-base font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── 2. Vital signs ───────────────────────────────────────────────────────────

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

// ── 3. The hero ──────────────────────────────────────────────────────────────

const AXIS = { tick: { fontSize: 11 }, stroke: "var(--color-muted-foreground)" } as const;

const TOOLTIP = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
} as const;

/** Compact dollars for an axis: $1.2k rather than $1,240, which collides at this width. */
function axisMoney(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
}

const shortDate = (d: string) => d.slice(5);

function SpendChart({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  if (loading) return <Skeleton className="h-64 w-full" />;
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

  return (
    <section className="rounded-lg border p-5" aria-labelledby="spend">
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

      {/*
        One series, so no legend: the heading names it. Total rather than a per-channel stack,
        because --channel-google and --channel-meta sit 0.3 dE apart under deuteranopia on the dark
        surface — two hues that cannot be told apart must not be asked to carry the split. That
        breakdown is stated in numbers below instead.
      */}
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.spendDaily} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="platform-spend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
            <YAxis tickFormatter={axisMoney} width={56} {...AXIS} tickLine={false} axisLine={false} />
            <Tooltip {...TOOLTIP} formatter={(v) => [moneyLabel(Number(v) * 100), "Spend"]} />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#platform-spend-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ── 4. Three readings ────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 p-5">
      <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Subscriptions({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
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

function GrowthChart({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  return (
    <Panel title="New people, per day">
      {loading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          {/* Zero-filled, unlike the spend series: a day with no signups really had none. */}
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.growthDaily} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" hide />
                <Tooltip
                  {...TOOLTIP}
                  labelFormatter={(d) => String(d)}
                  formatter={(v) => [String(v), "People"]}
                  cursor={{ fill: "var(--color-secondary)" }}
                />
                <Bar dataKey="users" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last 30 days. {data.growthDaily.reduce((n, d) => n + d.users, 0)} people joined.
          </p>
        </>
      )}
    </Panel>
  );
}

function ChannelSplit({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  return (
    <Panel title="Where it goes">
      {loading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : data.spendByPlatform.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing connected yet.</p>
      ) : (
        <ul className="space-y-3">
          {data.spendByPlatform.map((p) => {
            const share = data.totalSpend > 0 ? (p.spend / data.totalSpend) * 100 : 0;
            return (
              <li key={p.platform}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  {/* Slugs never reach the screen — CLAUDE.md. */}
                  <span className="truncate">{channelLabel(p.platform)}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums">
                    {moneyLabel(p.spend * 100)}
                    <span className="ml-2 text-muted-foreground">{share.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ── 5. Ways into an account ──────────────────────────────────────────────────

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
