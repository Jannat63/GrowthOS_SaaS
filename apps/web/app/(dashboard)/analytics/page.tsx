"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useMer } from "@/lib/hooks/useMer";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";

const RANGES = [30, 60, 90] as const;

export default function AnalyticsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);

  const { data: mer } = useMer(workspaceId, days);

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Blended MER</h1>
          <p className="text-sm text-muted-foreground">
            Total revenue ÷ ad spend across Google &amp; Meta — immune to platform attribution bias.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? "default" : "ghost"}
              onClick={() => setDays(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {!mer ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="relative overflow-hidden p-6">
              <span aria-hidden="true" className="ambient-glow -right-8 -top-10 h-40 w-40 bg-primary/20" />
              <div className="glass-surface relative rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Blended MER
                  <DataSourceBadge source={mer.source} platform={MODULE_PLATFORMS.blendedMer} />
                </div>
                <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                  {mer.data.summary.blendedMER.toFixed(2)}×
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{mer.data.summary.interpretation}</p>
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total ad spend
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                ${mer.data.summary.totalSpend.toLocaleString()}
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <ChannelBar label="Google Ads" value={mer.data.channelBreakdown.googleAdsSpend} total={mer.data.summary.totalSpend} tone="primary" />
                <ChannelBar label="Meta Ads" value={mer.data.channelBreakdown.metaAdsSpend} total={mer.data.summary.totalSpend} tone="success" />
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Week-over-week
              </p>
              <p className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", mer.data.anomaly.detected && "text-primary")}>
                {mer.data.anomaly.changePercent > 0 ? "+" : ""}
                {mer.data.anomaly.changePercent}%
              </p>
              {mer.data.anomaly.detected ? (
                <Badge variant="default" className="mt-2">
                  <AlertTriangle className="h-3 w-3" /> Anomaly &gt; 15%
                </Badge>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Within normal range.</p>
              )}
            </Card>
          </div>

          <Card className="p-6 text-primary">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              MER trend
            </h2>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mer.data.trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="merFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={40} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--color-muted-foreground)" }}
                    formatter={(v) => [`${Number(v).toFixed(2)}×`, "MER"]}
                  />
                  <ReferenceLine y={3} stroke="var(--color-success)" strokeDasharray="4 4" label={{ value: "Healthy 3×", position: "insideTopRight", fontSize: 10, fill: "var(--color-success)" }} />
                  <Area type="monotone" dataKey="mer" stroke="currentColor" strokeWidth={2} fill="url(#merFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ChannelBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "primary" | "success";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone === "primary" ? "bg-primary" : "bg-success")} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right tabular-nums">${Math.round(value)}</span>
    </div>
  );
}
