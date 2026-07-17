"use client";
import Link from "next/link";
import {
  Area,
  AreaChart,
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
  Wallet,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import type { Recommendation } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useMer } from "@/lib/hooks/useMer";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useFatigue } from "@/lib/hooks/useFatigue";
import { useConnections } from "@/lib/hooks/useConnections";
import { platformToChannel, type ChannelKey } from "@/components/dashboard/channels";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

// The four "moves" of the loop — each maps to a recommendation type + its module.
const MOVES = [
  { type: "paid_to_organic", label: "Content opportunities", hint: "Paid searches to rank for free", href: "/content-pipeline", icon: FileText },
  { type: "organic_to_paid", label: "Creative opportunities", hint: "Winning pages to amplify", href: "/creative-queue", icon: Megaphone },
  { type: "fatigue_alert", label: "Fatigue alerts", hint: "Creatives to refresh", href: "/fatigue-monitor", icon: Flame },
  { type: "cross_channel", label: "Cross-channel moves", hint: "Bridges across channels", href: "/growth-hub", icon: Sparkles },
] as const;

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
  cross_channel: "/growth-hub",
};

export default function GrowthHubPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: mer } = useMer(workspaceId, 30);
  const { data: recs } = useRecommendations(workspaceId);
  const { data: fatigue } = useFatigue(workspaceId);
  const { data: conn } = useConnections(workspaceId);

  const pending = (recs?.data ?? []).filter((r) => r.status === "pending");
  const atRisk = (fatigue?.data ?? []).filter((c) => c.status !== "healthy").length;
  const countByType = (t: string) => pending.filter((r) => r.type === t).length;

  const connectedKeys = new Set(
    (conn?.data ?? [])
      .filter((c) => c.isActive)
      .map((c) => platformToChannel(c.platform))
      .filter((k): k is ChannelKey => k !== null)
  );

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Growth Hub</h1>
          <p className="text-sm text-muted-foreground">
            One efficiency number, and the loop&rsquo;s next moves across every channel.
          </p>
        </div>
        {recs && <DataSourceBadge source={recs.source} />}
      </div>

      {/* Stat row — the MER tile is the signature: the one number the whole loop feeds. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MerTile mer={mer} />
        <StatTile
          icon={Wallet}
          label="Ad spend (30d)"
          value={mer ? `$${Math.round(mer.data.summary.totalSpend).toLocaleString()}` : undefined}
          hint="Google + Meta combined"
        />
        <StatTile
          icon={ListChecks}
          label="Open actions"
          value={recs ? String(pending.length) : undefined}
          hint="Recommendations awaiting you"
          href="#priority"
        />
        <StatTile
          icon={AlertTriangle}
          label="Creatives at risk"
          value={fatigue ? String(atRisk) : undefined}
          hint="Fatigued or approaching it"
          tone={atRisk > 0 ? "warn" : "default"}
          href="/fatigue-monitor"
        />
      </div>

      {/* Trend + priority actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 text-primary lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Blended MER trend
            </h2>
            <Link href="/analytics" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Analytics <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 h-56 w-full">
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
                  <Area type="monotone" dataKey="mer" stroke="currentColor" strokeWidth={2} fill="url(#hubMer)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-6" id="priority">
          <h2 className="font-display text-lg font-semibold tracking-tight">Priority actions</h2>
          <p className="mt-1 text-xs text-muted-foreground">Highest-impact moves right now.</p>
          <div className="mt-4 flex-1">
            {!recs ? (
              <Skeleton className="h-56 w-full" />
            ) : pending.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-medium">You&rsquo;re all caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">New moves appear as data flows in.</p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y">
                {pending.slice(0, 5).map((r: Recommendation) => (
                  <li key={r.id}>
                    <Link
                      href={TYPE_HREF[r.type] ?? "/growth-hub"}
                      className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary"
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_DOT[r.type] ?? "bg-primary")} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium">{r.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Impact {r.impactScore}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
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

      {/* Channel connections */}
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Channels
        </span>
        {(["seo", "google", "meta"] as ChannelKey[]).map((k) => {
          const connected = connectedKeys.has(k);
          const label = k === "seo" ? "SEO" : k === "google" ? "Google Ads" : "Meta Ads";
          return (
            <span key={k} className="inline-flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success" : "bg-muted-foreground/40")} />
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{connected ? "Connected" : "Not connected"}</span>
            </span>
          );
        })}
        <Link href="/settings" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          Manage <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
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
            <span className="font-display text-4xl font-semibold tabular-nums leading-none">
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
}: {
  icon: typeof Wallet;
  label: string;
  value: string | undefined;
  hint: string;
  href?: string;
  tone?: "default" | "warn";
}) {
  const body = (
    <Card className={cn("h-full p-5", href && "transition-colors hover:border-primary/40 hover:bg-secondary/40")}>
      <div className={cn("flex items-center gap-2 text-xs font-medium uppercase tracking-wide", tone === "warn" ? "text-destructive" : "text-muted-foreground")}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {value !== undefined ? (
        <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      ) : (
        <Skeleton className="mt-2 h-9 w-20" />
      )}
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
