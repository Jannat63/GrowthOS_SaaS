"use client";
import { useState } from "react";
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
import { DateRangePicker, type DateRange } from "@/components/admin/DateRangePicker";
import {
  BarList,
  ChannelSpark,
  ReturnLine,
  GrowthArea,
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
  // Undefined means "let the server choose" — the last 30 days of data that actually exists, which
  // is the only setting guaranteed to draw something on a seeded database.
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const { data, isLoading } = useAdminOverview(range);
  const a = data?.attention;

  const total =
    (a?.pastDueTotal ?? 0) +
    (a?.trialsEndingTotal ?? 0) +
    (a?.staleConnectionsTotal ?? 0) +
    (a?.failedJobsTotal ?? 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold tracking-tight">Overview</h1>
        {/*
          Against the page title rather than one chart, because it governs a whole zone. Which zone
          is stated where the figures are, not left to be worked out.
        */}
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/*
        Three zones, not eight stacked bands.

        The page had grown into a flat run of bordered blocks with nothing saying which belonged
        together, so reading it meant working out the grouping every time. It now says what it is
        organised by — what needs you, the money, the customers — and the related panels share one
        container instead of each getting its own frame.
      */}
      <section aria-labelledby="needs-you" className="space-y-3">
        <SectionHead
          id="needs-you"
          title="Needs you"
          aside={
            !isLoading &&
            total > 0 && (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {countLabel(total, "item")}
              </span>
            )
          }
        />

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : total === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
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

        <VitalSigns data={data} loading={isLoading} />
        <p className="text-xs text-muted-foreground">
          These are as of right now. The date range governs the two sections below.
        </p>
      </section>

      <section aria-labelledby="money" className="space-y-3">
        <SectionHead
          id="money"
          title="Money"
          aside={
            data?.spendWindow.from && (
              <span className="font-mono text-xs text-muted-foreground">
                {data.spendWindow.from} to {data.spendWindow.to}
              </span>
            )
          }
        />

        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : !data || data.spendDaily.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No advertising data in this window. Either nothing is connected yet, or the range falls
            outside what has been synced — widen it and this fills in.
          </p>
        ) : (
          <div className="rounded-lg border">
            <div className="grid divide-y lg:grid-cols-[2fr_1fr] lg:divide-x lg:divide-y-0">
              <SpendChartPanel data={data} />
              <FunnelPanel data={data} />
            </div>
            <div className="grid divide-y border-t lg:grid-cols-3 lg:divide-x lg:divide-y-0">
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
              <ReturnPanel data={data} loading={false} />
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="customers" className="space-y-3">
        <SectionHead id="customers" title="Customers" />
        <div className="rounded-lg border">
          <div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            <AccountsPanel data={data} loading={isLoading} />
            <GrowthPanel data={data} loading={isLoading} />
            <OutcomesPanel data={data} loading={isLoading} />
          </div>
          <div className="grid divide-y border-t lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            <NewestAccounts data={data} loading={isLoading} />
            <TopSpenders data={data} loading={isLoading} />
            <CampaignsPanel data={data} loading={isLoading} />
          </div>
        </div>
      </section>
    </div>
  );
}

/** A zone's name, and whatever qualifies it — a count, the window it covers. */
function SectionHead({
  id,
  title,
  aside,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b pb-2">
      <h2 id={id} className="font-display text-base font-semibold tracking-tight">
        {title}
      </h2>
      {aside}
    </div>
  );
}

/**
 * One reading inside a zone's container.
 *
 * A flex column with the footer pinned to the bottom. Grid cells stretch to the tallest sibling, so
 * a short panel beside a long one left a quarter of its height empty — the footer both fills that
 * and carries something worth reading, which is a better answer than shrinking the tall one until
 * everything is equally thin.
 */
function Panel({
  title,
  aside,
  footer,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  /** Pinned to the bottom edge. Supporting totals, not the panel's main point. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-auto border-t pt-3">{footer}</div>}
    </div>
  );
}

/** A label and a figure, for a panel's footer. */
function FootStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("font-mono text-xs tabular-nums", tone === "warning" && "text-warning")}
      >
        {value}
      </span>
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
        label="Paying customers"
        value={data?.payingCustomers}
        loading={loading}
        hint="Workspaces on an active subscription. The count behind the revenue figure."
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

/**
 * The page's one bold element: what every customer put through the platform, day by day.
 *
 * Split from the funnel beside it so both can sit in the Money zone's single container rather than
 * each carrying its own frame. The window is stated once, on the zone heading, instead of being
 * repeated on every panel inside it.
 */
function SpendChartPanel({ data }: { data: PlatformOverview }) {
  return (
    <div className="min-w-0 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="font-display text-sm font-semibold tracking-tight">
          Money moving through GrowthOS
        </h3>
        <p className="font-mono text-sm tabular-nums">{moneyLabel(data.totalSpend * 100)}</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Every customer&rsquo;s advertising spend, added together. Not our revenue — the money they
        run through the product.
      </p>
      <div className="mt-4">
        <SpendArea data={data.spendDaily} />
      </div>
    </div>
  );
}

/**
 * What that spend bought, ordered the way the money travels — shown, clicked, converted, earned —
 * so it reads as one chain rather than five unrelated counters.
 */
/**
 * What that spend bought, drawn as the funnel it is.
 *
 * It was five rows in a list, which is five counters rather than one chain — and the interesting
 * number in a funnel is never the count, it is what survives each step. The rate now sits *between*
 * the steps, on the connector, so the drop from 4.9M impressions to 5.4k conversions reads as two
 * decisions rather than two unrelated figures.
 *
 * No proportional bars. Clicks are 4.8% of impressions and conversions 2.3% of clicks, so a linear
 * bar for the last step is a hairline and a log scale is a chart nobody can read a value off. The
 * percentages carry it instead, which is what an operator quotes anyway.
 *
 * The money sits underneath, separated: revenue and unit costs are the result of the funnel rather
 * than a fourth stage of it. Pinned to the bottom so this panel and the chart beside it share a
 * baseline instead of trailing off into empty space.
 */
function FunnelPanel({ data }: { data: PlatformOverview }) {
  const { impressions, clicks, conversions, revenue } = data.funnel;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const cpc = clicks > 0 ? data.totalSpend / clicks : 0;
  const cpa = conversions > 0 ? data.totalSpend / conversions : 0;

  return (
    <div className="flex h-full min-w-0 flex-col p-5">
      <h3 className="font-display text-sm font-semibold tracking-tight">What it bought</h3>

      <ol className="mt-4">
        <Step label="Impressions" value={compact(impressions)} />
        <Connector rate={ctr} verb="clicked" />
        <Step label="Clicks" value={compact(clicks)} />
        <Connector rate={cvr} verb="converted" />
        <Step label="Conversions" value={compact(conversions)} last />
      </ol>

      <dl className="mt-auto space-y-2 border-t pt-4">
        <Reading label="Attributed revenue" value={moneyLabel(revenue * 100)} />
        <Reading
          label="Return on spend"
          value={data.totalSpend > 0 ? `${(revenue / data.totalSpend).toFixed(1)}x` : "—"}
        />
        <Reading label="Cost per click" value={cpc > 0 ? moneyLabel(cpc * 100) : "—"} />
        <Reading label="Cost per conversion" value={cpa > 0 ? moneyLabel(cpa * 100) : "—"} />
      </dl>
    </div>
  );
}

/** One stage of the funnel. The count is the headline; the label sits beside it, quiet. */
function Step({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <li className={cn("flex items-baseline justify-between gap-4", !last && "pb-1")}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-lg font-semibold tabular-nums">{value}</span>
    </li>
  );
}

/**
 * The drop between two stages.
 *
 * A short rule with the rate beside it rather than an arrow glyph: the line is the connector, and
 * it says "these two are one journey" without borrowing a decoration nothing else here uses.
 * Hidden from screen readers because the same rate is read out as part of the steps around it.
 */
function Connector({ rate, verb }: { rate: number; verb: string }) {
  return (
    <li className="flex items-center gap-2 py-1" aria-hidden="true">
      <span className="ml-1 h-5 w-px shrink-0 bg-border" />
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {rate.toFixed(2)}% {verb}
      </span>
    </li>
  );
}

/** A label and its figure, for the funnel's summary. */
function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

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
      footer={
        data && (
          <div className="space-y-2">
            <FootStat label="Recommendations generated" value={data.recommendationsGenerated} />
            <FootStat label="Content briefs written" value={data.briefsCreated} />
          </div>
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

/**
 * What the customer base is made of.
 *
 * This was three lines in a box stretched to the height of its neighbours, so it read as mostly
 * empty space. The plan mix went missing in the rebuild — it was the one genuinely useful thing on
 * the original overview — so it comes back here as bars, and gives the panel the substance the
 * others already had.
 */
function AccountsPanel({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  const planTotal = data?.workspacesByPlan.reduce((n, p) => n + p.count, 0) ?? 0;

  return (
    <Panel
      title="Accounts"
      aside={
        data && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {data.totalWorkspaces}
          </span>
        )
      }
      footer={
        data && (
          <FootStat
            label="Connected integrations"
            value={data.connectedPlatforms}
            tone={data.connectedPlatforms === 0 ? "warning" : undefined}
          />
        )
      }
    >
      {loading || !data ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-4">
          <BarList
            rows={PLAN_ORDER.filter((plan) =>
              data.workspacesByPlan.some((p) => p.plan === plan)
            ).map((plan) => {
              const n = data.workspacesByPlan.find((p) => p.plan === plan)?.count ?? 0;
              return {
                key: plan,
                label: planLabel(plan),
                value: String(n),
                share: planTotal > 0 ? (n / planTotal) * 100 : 0,
              };
            })}
          />

          {/*
            Revenue, said plainly either way. A bare "$0" leaves an operator to work out whether
            that means nobody has paid or the figure is broken; naming the state answers it.
          */}
          <div className="border-t pt-3">
            {data.payingCustomers === 0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Nobody is paying yet. Revenue is genuinely {moneyLabel(0)}, not unmeasured.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.revenueByPlan.map((r) => (
                  <li key={r.plan} className="flex items-baseline justify-between gap-4 text-sm">
                    <span>
                      {planLabel(r.plan)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {countLabel(r.customers, "customer")}
                      </span>
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      {moneyLabel(r.mrrCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ul className="space-y-2 border-t pt-3">
            {data.subscriptionMix.map((row) => (
              <li key={row.status} className="flex items-baseline justify-between gap-4 text-sm">
                <span
                  className={cn(
                    row.status === "past_due" && row.count > 0 && "text-destructive",
                    // A zero is context, not news: it stays legible but does not compete with the
                    // rows that have something in them.
                    row.count === 0 && "text-muted-foreground"
                  )}
                >
                  {subscriptionStatusLabel(row.status)}
                </span>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    row.count === 0 && "text-muted-foreground"
                  )}
                >
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/** Plans are ordinal, so the mix is drawn in tier order rather than by size. */
const PLAN_ORDER = ["starter", "growth", "scale"];

function GrowthPanel({ data, loading }: { data?: PlatformOverview; loading: boolean }) {
  const joined = data?.growthDaily.reduce((n, x) => n + x.users, 0) ?? 0;
  return (
    <Panel
      title="People joining"
      aside={
        data && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">+{joined}</span>
        )
      }
      footer={
        data && (
          <div className="space-y-2">
            <FootStat label="People, all time" value={data.totalUsers} />
            <FootStat label="Joined this week" value={data.signupsLast7d} />
          </div>
        )
      }
    >
      {loading || !data ? (
        <Skeleton className="h-28 w-full" />
      ) : joined === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Nobody signed up in this window. Widen the range to find the last time somebody did.
        </p>
      ) : (
        <>
          <GrowthArea data={data.growthDaily} />
          <p className="mt-2 text-xs text-muted-foreground">
            Running total across the window. {joined} {joined === 1 ? "person" : "people"} joined.
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
