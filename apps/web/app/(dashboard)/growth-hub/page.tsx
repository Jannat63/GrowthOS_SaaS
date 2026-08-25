"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  FileText,
  Megaphone,
  Flame,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  ListChecks,
  DollarSign,
  MousePointerClick,
  ShoppingCart,
  Search,
  Wallet,
} from "lucide-react";
import type { Recommendation } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
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
import { GoalSimulator } from "@/components/dashboard/GoalSimulator";
import { ScoreGauge, computeGrowthScore } from "@/components/dashboard/ScoreGauge";
import { severityFromScore, SEVERITY_BADGE_VARIANT } from "@/components/dashboard/severity";

// The four "moves" of the loop — each maps to a recommendation type + its module.
const MOVES = [
  { type: "paid_to_organic", label: "Content opportunities", hint: "Paid searches to rank for free", href: "/content-pipeline", icon: FileText },
  { type: "organic_to_paid", label: "Creative opportunities", hint: "Winning pages to amplify", href: "/creative-queue", icon: Megaphone },
  { type: "fatigue_alert", label: "Fatigue alerts", hint: "Creatives to refresh", href: "/fatigue-monitor", icon: Flame },
  { type: "cross_channel", label: "Cross-channel moves", hint: "Bridges across channels", href: "/growth-hub", icon: Sparkles },
] as const;

const TYPE_HREF: Record<string, string> = {
  paid_to_organic: "/content-pipeline",
  organic_to_paid: "/creative-queue",
  fatigue_alert: "/fatigue-monitor",
  cross_channel: "/growth-hub",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function GrowthHubPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const firstName = me?.data.user?.name?.split(" ")[0];

  const { data: mer } = useMer(workspaceId, 30);
  const { data: hub } = useGrowthHub(workspaceId, 30);
  const { data: recs } = useRecommendations(workspaceId);
  const { data: conn } = useConnections(workspaceId);

  const kpi = (key: string) => hub?.data.kpis.find((k) => k.key === key);

  const pending = (recs?.data ?? []).filter((r) => r.status === "pending");
  const countByType = (t: string) => pending.filter((r) => r.type === t).length;
  // One fatigue_alert is generated per non-healthy creative, so this is the at-risk count,
  // and — since it's the loop's only "something is degrading" type — also the Needs Attention list.
  const atRisk = countByType("fatigue_alert");
  const needsAttention = pending
    .filter((r) => r.type === "fatigue_alert")
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, 4);
  const topOpportunities = pending
    .filter((r) => r.type !== "fatigue_alert")
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 4);
  const priorityActions = [...pending]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 5);
  const highUrgencyPending = pending.filter(
    (r) => severityFromScore(r.urgencyScore) === "High"
  ).length;

  const trend = mer?.data.trend ?? [];
  const merTrendPct =
    trend.length >= 2 && trend[0].mer > 0
      ? ((trend[trend.length - 1].mer - trend[0].mer) / trend[0].mer) * 100
      : null;
  const growthScore = recs && mer ? computeGrowthScore({ merTrendPct, atRiskCreatives: atRisk, highUrgencyPending }) : null;

  const connectedKeys = new Set(
    (conn?.data ?? [])
      .filter((c) => c.isActive)
      .map((c) => platformToChannel(c.platform))
      .filter((k): k is ChannelKey => k !== null)
  );

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One efficiency number, and the loop&rsquo;s next moves across every channel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {recs && <DataSourceBadge source={recs.source} platform={MODULE_PLATFORMS.crossChannel} />}
        </div>
      </div>

      {/* Growth Score — a signature glass card. Composite of this workspace's own signals
          (MER trend, creative health, open priority load); never a claim vs. other businesses,
          since there's no peer dataset behind this app to back that. */}
      <Card className="relative overflow-hidden p-6">
        <span aria-hidden="true" className="ambient-glow -right-10 -top-16 h-64 w-64 bg-primary/20" />
        <span aria-hidden="true" className="ambient-glow -left-16 bottom-0 h-48 w-48 bg-warning/10" />
        <div className="glass-surface relative rounded-xl p-5">
          {growthScore !== null ? (
            <ScoreGauge score={growthScore} />
          ) : (
            <div className="flex items-center gap-4">
              <Skeleton className="h-[120px] w-[120px] rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Stat row — four headline numbers, matching what the loop actually reports. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={DollarSign}
          label="Revenue (30d)"
          value={kpi("revenue")?.value}
          deltaPct={kpi("revenue")?.deltaPct}
          hint="Blended across every channel"
        />
        <MerTile mer={mer} />
        <StatTile
          icon={ShoppingCart}
          label="Conversions (30d)"
          value={kpi("conversions")?.value}
          deltaPct={kpi("conversions")?.deltaPct}
          hint="Google + Meta combined"
        />
        <StatTile
          icon={MousePointerClick}
          label="Organic clicks (30d)"
          value={kpi("organicClicks")?.value}
          deltaPct={kpi("organicClicks")?.deltaPct}
          hint="Search Console, all pages"
          href="/seo"
        />
      </div>

      {/* Needs Attention / Top Opportunities / Priority Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ActionListCard
          title="Needs attention"
          icon={AlertTriangle}
          tone="warn"
          items={needsAttention}
          loading={!recs}
          emptyLabel="No creatives at risk right now."
        />
        <ActionListCard
          title="Top opportunities"
          icon={Target}
          tone="default"
          items={topOpportunities}
          loading={!recs}
          emptyLabel="New opportunities appear as data flows in."
        />
        <ActionListCard
          title="Priority actions"
          icon={ListChecks}
          tone="default"
          items={priorityActions}
          loading={!recs}
          emptyLabel="You're all caught up."
          numbered
        />
      </div>

      {/* Channel performance + Goal Simulator */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">Channel performance</h2>
            <Link href="/analytics" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Full report <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ChannelColumn
              channelKey="seo"
              label="SEO"
              icon={Search}
              connected={connectedKeys.has("seo")}
              rows={[{ label: "Organic clicks", value: kpi("organicClicks")?.value, deltaPct: kpi("organicClicks")?.deltaPct }]}
              href="/seo"
              loading={!hub}
            />
            <ChannelColumn
              channelKey="google"
              label="Google Ads"
              icon={MousePointerClick}
              connected={connectedKeys.has("google")}
              rows={[
                { label: "Spend", value: mer ? `$${Math.round(mer.data.channelBreakdown.googleAdsSpend).toLocaleString()}` : undefined },
                { label: "Conversions", value: hub ? String(hub.data.channelMetric.google.split(" ")[0]) : undefined },
              ]}
              href="/google-ads"
              loading={!hub || !mer}
            />
            <ChannelColumn
              channelKey="meta"
              label="Meta Ads"
              icon={Megaphone}
              connected={connectedKeys.has("meta")}
              rows={[
                { label: "Spend", value: mer ? `$${Math.round(mer.data.channelBreakdown.metaAdsSpend).toLocaleString()}` : undefined },
                { label: "Conversions", value: hub ? String(hub.data.channelMetric.meta.split(" ")[0]) : undefined },
              ]}
              href="/meta-ads"
              loading={!hub || !mer}
            />
          </div>
        </Card>

        <GoalSimulator baseline={hub?.data.baseline} />
      </div>

      {/* The loop's four moves */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MOVES.map(({ type, label, hint, href, icon: Icon }) => {
          const count = recs ? countByType(type) : undefined;
          return (
            <Link key={type} href={href}>
              <Card className="group h-full p-5 transition-colors hover:border-primary/40 hover:bg-secondary/40">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-display text-2xl font-semibold tabular-nums">
                    {count ?? "—"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Action list (Needs attention / Top opportunities / Priority actions) ──────

function ActionListCard({
  title,
  icon: Icon,
  tone,
  items,
  loading,
  emptyLabel,
  numbered,
}: {
  title: string;
  icon: typeof AlertTriangle;
  tone: "warn" | "default";
  items: Recommendation[];
  loading: boolean;
  emptyLabel: string;
  numbered?: boolean;
}) {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2 text-sm font-semibold", tone === "warn" && items.length > 0 ? "text-warning" : "text-foreground")}>
          <Icon className="h-4 w-4" /> {title}
        </div>
        {!loading && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {items.length}
          </span>
        )}
      </div>
      <div className="mt-3 flex-1">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((r, i) => (
              <li key={r.id}>
                <Link
                  href={TYPE_HREF[r.type] ?? "/growth-hub"}
                  className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary"
                >
                  {numbered && (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary">
                      {i + 1}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium">{r.title}</span>
                      <Badge variant={SEVERITY_BADGE_VARIANT[severityFromScore(r.urgencyScore)]} className="shrink-0">
                        {severityFromScore(r.urgencyScore)}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{r.body}</span>
                  </span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ── Channel performance column ────────────────────────────────────────────────

function ChannelColumn({
  label,
  icon: Icon,
  connected,
  rows,
  href,
  loading,
}: {
  channelKey: ChannelKey;
  label: string;
  icon: typeof Search;
  connected: boolean;
  rows: { label: string; value: string | undefined; deltaPct?: number | null }[];
  href: string;
  loading: boolean;
}) {
  return (
    <Link href={href} className="block rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" /> {label}
        </span>
        <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success" : "bg-muted-foreground/40")} />
      </div>
      {!connected ? (
        <p className="mt-3 text-xs text-muted-foreground">Not connected</p>
      ) : loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="flex items-baseline gap-1.5 text-sm font-semibold tabular-nums">
                {row.value ?? "—"}
                {row.deltaPct != null && (
                  <span className={cn("text-[0.65rem] font-medium", row.deltaPct > 0 ? "text-success" : row.deltaPct < 0 ? "text-destructive" : "text-muted-foreground")}>
                    {row.deltaPct > 0 ? "+" : ""}
                    {row.deltaPct}%
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

// ── Tiles ────────────────────────────────────────────────────────────────────

function MerTile({ mer }: { mer: ReturnType<typeof useMer>["data"] }) {
  return (
    <Card className="relative overflow-hidden p-5 ring-1 ring-primary/15">
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <TrendingUp className="h-3.5 w-3.5" /> Blended efficiency
      </div>
      {mer ? (
        <>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-3xl font-semibold tabular-nums leading-none">
              {mer.data.summary.blendedMER.toFixed(2)}×
            </span>
          </div>
          <div className="mt-3 h-8 text-primary">
            <Sparkline values={mer.data.trend.map((t) => t.mer)} />
          </div>
          <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
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
}: {
  icon: typeof Wallet;
  label: string;
  value: string | undefined;
  hint: string;
  href?: string;
  tone?: "default" | "warn";
  /** null = the previous window was zero, so no percentage change exists to show. */
  deltaPct?: number | null;
}) {
  const body = (
    <Card className={cn("flex h-full flex-col p-5", href && "transition-colors hover:border-primary/40 hover:bg-secondary/40")}>
      <div className={cn("flex items-center gap-2 text-xs font-medium uppercase tracking-wide", tone === "warn" ? "text-destructive" : "text-muted-foreground")}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {value !== undefined ? (
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
          {deltaPct != null && (
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
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
      <p className="mt-auto pt-3 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
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
