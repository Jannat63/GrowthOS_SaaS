"use client";
import Link from "next/link";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  FileText,
  Megaphone,
  Flame,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  ListChecks,
  Clock,
  DollarSign,
  MousePointerClick,
  ShoppingCart,
} from "lucide-react";
import type { Recommendation } from "@growthos/types";
import { channelLabel } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useMer } from "@/lib/hooks/useMer";
import { useGrowthHub } from "@/lib/hooks/useGrowthHub";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useConnections } from "@/lib/hooks/useConnections";
import { platformToChannel, type ChannelKey } from "@/components/dashboard/channels";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { ScoreGauge, computeGrowthScore, type ScoreDriver } from "@/components/dashboard/ScoreGauge";
import { severityFromScore } from "@/components/dashboard/severity";
import { GoalSimulator } from "@/components/dashboard/GoalSimulator";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useRangeStore } from "@/lib/stores/range";

/**
 * The four "moves" of the loop — each a recommendation type, its module, and where it goes.
 *
 * These four counts SUM to the Open actions total, which is why they render inside that panel
 * rather than as their own row further down the page. They were previously separated by most of
 * the page's height, so the total and its parts read as unrelated facts that happened to add up.
 */
const MOVES = [
  { type: "paid_to_organic", label: "Content opportunities", hint: "Paid searches to rank for free", href: "/content-pipeline", icon: FileText },
  { type: "organic_to_paid", label: "Creative opportunities", hint: "Winning pages to amplify", href: "/creative-queue", icon: Megaphone },
  { type: "fatigue_alert", label: "Fatigue alerts", hint: "Creatives to refresh", href: "/fatigue-monitor", icon: Flame },
  // Was "/growth-hub" — the page this card lives on, so the largest count in the group was a
  // click that went nowhere. Cross-channel recs are listed on /recommendations.
  { type: "cross_channel", label: "Cross-channel moves", hint: "Bridges across channels", href: "/recommendations", icon: Sparkles },
] as const;

/**
 * The line under a priority action.
 *
 * This used to read "Impact {impactScore}", which is a three-value lookup (High/Medium/Low →
 * 90/60/30) — so five high-impact recommendations all rendered the identical string "Impact 90"
 * and the list looked unranked. Worse, `impactScore` is not what the list is sorted by: both the
 * API and the hook order on `compositeScore`. Naming the bridge and printing the score that
 * actually determines position makes the ordering legible instead of arbitrary.
 */
function recReason(r: Recommendation): string {
  const priority = `priority ${r.compositeScore}`;
  const crossChannel =
    r.sourceChannel && r.targetChannel && r.sourceChannel !== r.targetChannel && r.sourceChannel !== "unified";
  return crossChannel
    ? `${channelLabel(r.sourceChannel)} → ${channelLabel(r.targetChannel)} · ${priority}`
    : priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * The healthy-MER threshold the blended-mer engine names in its own interpretation string
 * ("well above healthy benchmark of 3x"). Drawn on the trend chart so the number has a scale
 * rather than only an adjective.
 */
const MER_BENCHMARK = 3;

/** Display names for the three channel nodes, in the order the strip lists them. */
const CHANNEL_LABEL: Record<ChannelKey, string> = {
  seo: "SEO",
  google: "Google Ads",
  meta: "Meta Ads",
};

const TYPE_DOT: Record<string, string> = {
  paid_to_organic: "bg-primary",
  organic_to_paid: "bg-success",
  fatigue_alert: "bg-destructive",
  cross_channel: "bg-primary",
};
const TYPE_HREF: Record<string, string> = {
  paid_to_organic: "/content-pipeline",
  organic_to_paid: "/creative-queue",
  fatigue_alert: "/fatigue-monitor",
  cross_channel: "/recommendations",
};

export default function GrowthHubPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  // One window for every figure on the page. Was hardcoded to 30 in both calls, with "(30d)"
  // written into the tile labels — so the range was a claim the page made rather than a choice.
  const range = useRangeStore((s) => s.range);
  const { data: mer } = useMer(workspaceId, range);
  const { data: hub } = useGrowthHub(workspaceId, range);
  // The window the API actually resolved — the tile labels follow it rather than local intent, so
  // they never claim a range the figures below them were not measured over.
  const days = hub?.data.windowDays ?? 30;
  const { data: recs } = useRecommendations(workspaceId);
  const { data: conn } = useConnections(workspaceId);

  const kpi = (key: string) => hub?.data.kpis.find((k) => k.key === key);

  const pending = (recs?.data ?? []).filter((r) => r.status === "pending");
  const countByType = (t: string) => pending.filter((r) => r.type === t).length;
  // NOTE: there is deliberately no separate "Creatives at risk" tile any more. It rendered
  // countByType("fatigue_alert") — the exact number the Fatigue alerts row inside Open actions
  // already shows — so the page displayed one value in three places: the total, the breakdown
  // row, and a headline tile that looked like an independent metric.

  // Growth score inputs. Self-referential by construction — this workspace against its own
  // trend, never a percentile against other businesses, because no peer dataset exists behind
  // this app to back that kind of claim.
  const highUrgencyPending = pending.filter(
    (r) => severityFromScore(r.urgencyScore) === "High"
  ).length;
  const trend = mer?.data.trend ?? [];
  const merTrendPct =
    trend.length >= 2 && trend[0]!.mer > 0
      ? ((trend[trend.length - 1]!.mer - trend[0]!.mer) / trend[0]!.mer) * 100
      : null;
  const atRiskCreatives = countByType("fatigue_alert");
  const growthScore =
    recs && mer
      ? computeGrowthScore({ merTrendPct, atRiskCreatives, highUrgencyPending })
      : null;

  // The same three figures computeGrowthScore just weighted (40/30/30), read back out for the
  // gauge card rather than re-summarised — so the number and its explanation cannot disagree.
  const scoreDrivers: ScoreDriver[] = [
    {
      icon: merTrendPct !== null && merTrendPct < 0 ? TrendingDown : TrendingUp,
      label: "Blended efficiency",
      value:
        merTrendPct === null
          ? "No trend yet"
          : `${merTrendPct >= 0 ? "+" : ""}${merTrendPct.toFixed(1)}% this window`,
      attention: merTrendPct !== null && merTrendPct < 0,
    },
    {
      icon: Flame,
      label: "Creatives at risk",
      value: atRiskCreatives === 0 ? "None" : `${atRiskCreatives} fatiguing`,
      attention: atRiskCreatives > 0,
    },
    {
      icon: ListChecks,
      label: "High-urgency work",
      value: highUrgencyPending === 0 ? "None open" : `${highUrgencyPending} open`,
      attention: highUrgencyPending > 0,
    },
  ];

  const connectedKeys = new Set(
    (conn?.data ?? [])
      .filter((c) => c.isActive)
      .map((c) => platformToChannel(c.platform))
      .filter((k): k is ChannelKey => k !== null)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Growth Hub</h1>
          <p className="text-sm text-muted-foreground">
            One efficiency number, and the loop&rsquo;s next moves across every channel.
          </p>
          <Freshness dataThrough={hub?.data.dataThrough ?? null} />
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            dataFrom={hub?.data.dataFrom}
            dataThrough={hub?.data.dataThrough}
            activeRange={hub?.data.window}
          />
          {recs && <DataSourceBadge source={recs.source} platform={MODULE_PLATFORMS.crossChannel} />}
        </div>
      </div>

      {/* Growth score — a composite of this workspace's own signals (MER trend, creative health,
          open priority load). Sits above the tiles because it is the one figure that answers
          "how are we doing" without reading the rest of the page. The three drivers beside the
          ring fill the row with the same weighted inputs rather than leaving it empty next to a
          120px circle — see ScoreGauge's own doc comment. Plain Card, matching every other card
          on this page; it was the one surface here dressed in glass/glow and it read as an
          unrelated ad, not as this page's own headline figure. */}
      <Card className="p-6">
        {growthScore !== null ? (
          <ScoreGauge score={growthScore} drivers={scoreDrivers} />
        ) : (
          <div className="flex items-center gap-4">
            <Skeleton className="h-[120px] w-[120px] rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        )}
      </Card>

      {conn && connectedKeys.size === 0 && (
        <ChannelStrip connectedKeys={connectedKeys} channelMetric={hub?.data.channelMetric} prominent />
      )}

      {/* ── Performance ──────────────────────────────────────────────────────
          One band, one tile shape. Every tile carries the same three things — value, change,
          sparkline — so the row has no tall sibling to stretch to. Previously the MER tile (with
          a sparkline) and the Goal Simulator (a form) set the height of their rows and the plain
          tiles beside them padded out the difference with ~180px of nothing. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MerTile mer={mer} className="xl:col-span-2" />
        <StatTile
          icon={DollarSign}
          label={`Revenue (${days}d)`}
          value={kpi("revenue")?.value}
          deltaPct={kpi("revenue")?.deltaPct}
          series={kpi("revenue")?.series}
          hint="Blended across every channel"
        />
        <StatTile
          icon={Wallet}
          label={`Ad spend (${days}d)`}
          value={kpi("adSpend")?.value}
          deltaPct={kpi("adSpend")?.deltaPct}
          series={kpi("adSpend")?.series}
          hint="Google + Meta combined"
        />
        <StatTile
          icon={ShoppingCart}
          label={`Conversions (${days}d)`}
          value={kpi("conversions")?.value}
          deltaPct={kpi("conversions")?.deltaPct}
          series={kpi("conversions")?.series}
          hint="Google + Meta combined"
        />
        <StatTile
          icon={MousePointerClick}
          label={`Organic clicks (${days}d)`}
          value={kpi("organicClicks")?.value}
          deltaPct={kpi("organicClicks")?.deltaPct}
          series={kpi("organicClicks")?.series}
          hint="Search Console, all pages"
          href="/seo"
        />
      </div>

      {/* ── Trend + projection ───────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col p-6 text-primary lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Blended MER trend
            </h2>
            <Link href="/analytics" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
              Analytics <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 w-full flex-1 min-h-[14rem]">
            {mer ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mer.data.trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="hubMer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(d: string) => d.slice(5)} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--color-muted-foreground)" }}
                    formatter={(v) => [`${Number(v).toFixed(2)}×`, "MER"]}
                  />
                  {/* The engine calls 3x the healthy benchmark in `interpretation`; without this
                      line the reader has a curve and no scale to judge it against. */}
                  <ReferenceLine
                    y={MER_BENCHMARK}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.55}
                    label={{
                      value: `${MER_BENCHMARK}x benchmark`,
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                  <Area type="monotone" dataKey="mer" stroke="currentColor" strokeWidth={2} fill="url(#hubMer)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </Card>

        <GoalSimulator baseline={hub?.data.baseline} />
      </div>

      {/* ── The queue, and what it is made of ────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col p-6 lg:col-span-2" id="priority">
          <h2 className="font-display text-lg font-semibold tracking-tight">Priority actions</h2>
          <p className="mt-1 text-xs text-muted-foreground">Highest-impact moves right now.</p>
          <div className="mt-4 flex-1">
            {!recs ? (
              <Skeleton className="h-56 w-full" />
            ) : pending.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <p className="text-sm font-medium">You&rsquo;re all caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">New moves appear as data flows in.</p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y">
                {pending.slice(0, 5).map((r: Recommendation) => (
                  <li key={r.id}>
                    <Link
                      href={TYPE_HREF[r.type] ?? "/recommendations"}
                      className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-primary/10"
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_DOT[r.type] ?? "bg-primary")} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium">{r.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {recReason(r)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <WorkQueue recs={recs} pending={pending} countByType={countByType} />
      </div>

      {/* Connected channels live at the BOTTOM only while there is something connected — at that
          point they are status. With nothing connected they are the reason every figure above is
          invented and the only action that changes it, so they lead instead (see ChannelStrip). */}
      {connectedKeys.size > 0 && (
        <ChannelStrip connectedKeys={connectedKeys} channelMetric={hub?.data.channelMetric} />
      )}

    </div>
  );
}

/**
 * "Data through 17 Jul", plus how far behind that is.
 *
 * The dashboard had no freshness signal at all: a seeded workspace is anchored weeks in the past,
 * and nothing on screen said so, which makes stale numbers indistinguishable from current ones.
 * `Date.now()` is safe here because the whole page is a client component that only renders this
 * once the query has resolved — there is no server render of this line to disagree with.
 */
function Freshness({ dataThrough }: { dataThrough: string | null }) {
  if (!dataThrough) return null;
  const when = new Date(`${dataThrough}T00:00:00Z`);
  const daysBehind = Math.floor((Date.now() - when.getTime()) / 86_400_000);
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      Data through{" "}
      {when.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" })}
      {daysBehind >= 2 && (
        <span className={cn(daysBehind >= 7 && "text-warning")}>· {daysBehind} days behind</span>
      )}
    </p>
  );
}

/**
 * Which channels feed the numbers on this page.
 *
 * `prominent` is for the zero-connected case, where this is the most important thing on the
 * screen rather than a footer: it moves above the metrics and carries the action. It deliberately
 * does NOT repeat the sample-data warning — SampleDataNotice already says that once, at the top of
 * the dashboard shell, and saying it twice more would be noise. This says which channels, and how
 * to fix it.
 */
function ChannelStrip({
  connectedKeys,
  channelMetric,
  prominent = false,
}: {
  connectedKeys: Set<ChannelKey>;
  channelMetric: Record<ChannelKey, string> | undefined;
  prominent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 p-5",
        prominent && "border-primary/30 bg-primary/[0.03]"
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Channels
      </span>
      {(["seo", "google", "meta"] as ChannelKey[]).map((k) => {
        const connected = connectedKeys.has(k);
        return (
          <span key={k} className="inline-flex items-center gap-2 text-sm">
            <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success" : "bg-muted-foreground/40")} />
            <span className="font-medium">{CHANNEL_LABEL[k]}</span>
            <span className="text-xs text-muted-foreground">
              {connected ? (channelMetric?.[k] ?? "Connected") : "Not connected"}
            </span>
          </span>
        );
      })}
      {prominent ? (
        <Button asChild size="sm" className="ml-auto">
          <Link href="/settings">Connect a channel</Link>
        </Button>
      ) : (
        <Link
          href="/settings"
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          Manage <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </Card>
  );
}

// ── Tiles ────────────────────────────────────────────────────────────────────

function MerTile({
  mer,
  className,
}: {
  mer: ReturnType<typeof useMer>["data"];
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-5 ring-1 ring-primary/15", className)}>
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex min-h-8 items-start gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Blended efficiency
      </div>
      {mer ? (
        <>
          <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="font-display text-4xl font-semibold tabular-nums leading-none">
              {mer.data.summary.blendedMER.toFixed(2)}×
            </span>
            {/* The API computes this on every MER read (last 7 days vs. the prior 7) and it went
                unrendered — a swing big enough to trip the alert threshold is the most useful
                thing this tile can say, and it was being thrown away. */}
            {mer.data.anomaly.detected && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
                  mer.data.anomaly.changePercent >= 0
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {mer.data.anomaly.changePercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {mer.data.anomaly.changePercent > 0 ? "+" : ""}
                {mer.data.anomaly.changePercent}% vs prior 7d
              </span>
            )}
          </div>
          <div className="mt-3 h-8 text-primary">
            <Sparkline values={mer.data.trend.map((t) => t.mer)} />
          </div>
          {/* Two lines, not one: at line-clamp-1 this cut "well above healthy benchmark of 3x"
              down to "well above healthy…", removing the only figure that gives the number scale. */}
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {mer.data.summary.interpretation}
          </p>
        </>
      ) : (
        <Skeleton className="mt-2 h-24 w-full" />
      )}
    </Card>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "default",
  deltaPct,
  series,
}: {
  icon: typeof Wallet;
  label: string;
  value: string | undefined;
  hint: string;
  href?: string;
  tone?: "default" | "warn";
  /** null = the previous window was zero, so no percentage change exists to show. */
  deltaPct?: number | null;
  /** Daily values across the window. Rendered in the same slot the MER tile's sparkline occupies,
   *  which is what keeps every tile in the row the same height without stretching anything. */
  series?: number[];
}) {
  const body = (
    <Card className={cn("@container flex h-full flex-col p-5", href && "transition-colors hover:border-primary/40 hover:bg-primary/10")}>
      {/* Two lines reserved whether the label needs them or not. At six columns "Organic clicks
          (30d)" wraps while "Revenue (30d)" does not, which pushed half the row's values a line
          lower than the other half and broke the one thing a row of tiles is for — comparing them
          at a glance. */}
      <div className={cn("flex min-h-8 items-start gap-2 text-xs font-medium uppercase tracking-wide", tone === "warn" ? "text-destructive" : "text-muted-foreground")}>
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {label}
      </div>
      {value !== undefined ? (
        // The delta used to sit outside the card: a `text-3xl` currency value plus a percentage
        // does not fit a sixth of the row, and neither flex item could shrink, so the overflow went
        // straight past the border. The size now follows the *card's* width rather than the
        // viewport's — at six columns the viewport is wide and the tile is not, so a breakpoint
        // cannot see this. `flex-wrap` is the backstop for a value longer than any of these.
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="font-display text-2xl font-semibold tabular-nums @[15rem]:text-3xl">{value}</p>
          {deltaPct != null && (
            <span
              className={cn(
                "shrink-0 text-xs font-medium tabular-nums",
                deltaPct > 0 ? "text-success" : deltaPct < 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {deltaPct > 0 ? "+" : ""}
              {deltaPct}%
            </span>
          )}
        </div>
      ) : (
        <Skeleton className="mt-2 h-9 w-20" />
      )}
      {/* Fixed height whether or not a series arrived, so a metric without one does not collapse
          the tile and reintroduce the ragged row this replaced. Muted rather than ember: the
          accent stays reserved for the MER tile, which is the one that should draw the eye. */}
      <div className="mt-3 h-8 text-muted-foreground/45">
        {series && series.length > 1 ? <Sparkline values={series} /> : null}
      </div>
      <p className="mt-auto pt-3 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/**
 * Open actions, with its own breakdown inside it.
 *
 * The four counts sum to the total above them. They used to live in a separate four-card row near
 * the bottom of the page, roughly 1,400px from the total they add up to, so nothing connected the
 * two — the page stated a sum and then, much later, its parts.
 */
function WorkQueue({
  recs,
  pending,
  countByType,
}: {
  recs: ReturnType<typeof useRecommendations>["data"];
  pending: Recommendation[];
  countByType: (type: string) => number;
}) {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Open actions</h2>
        <span className="font-display text-2xl font-semibold tabular-nums">
          {recs ? pending.length : "—"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Everything waiting on you, by kind.</p>

      <ul className="mt-3 flex flex-1 flex-col divide-y">
        {MOVES.map(({ type, label, hint, href, icon: Icon }) => {
          const count = recs ? countByType(type) : undefined;
          return (
            <li key={type}>
              <Link
                href={href}
                className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-primary/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {count ?? "—"}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// Minimal token-safe sparkline (stroke = currentColor).
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 100;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
