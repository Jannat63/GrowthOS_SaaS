"use client";
import { useMemo } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Minus, Scale, TrendingUp } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useMer } from "@/lib/hooks/useMer";
import { useGrowthHub } from "@/lib/hooks/useGrowthHub";
import { useRangeStore } from "@/lib/stores/range";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { anomalyOf } from "@/lib/mock-data/mer";
import { MerTrendChart, RevenueVsSpendChart, ChartLegend } from "@/components/analytics/MerCharts";
import { ratio, share, signedPercent, usd, whatMoved } from "@/components/analytics/merFormat";

export default function AnalyticsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  // Shared with every other module rather than local state: a reader who picks 90d here and opens
  // the Growth Hub is still asking about 90d.
  const range = useRangeStore((s) => s.range);
  // Only for the picker's bounds — the hub call is already cached by the Growth Hub page.
  const { data: hub } = useGrowthHub(workspaceId, range);
  const { data: mer } = useMer(workspaceId, range);

  const d = mer?.data;

  /**
   * The week-over-week comparison, derived from the trend rather than read off `anomaly`.
   *
   * The API returns only `changePercent`, so the card could state a verdict without the two figures
   * it came from. `anomalyOf` runs the same last-7-vs-prior-7 average the API runs, over the same
   * trend the API returned, so it cannot disagree with it — it just also keeps the operands.
   */
  const wow = useMemo(() => (d ? anomalyOf(d.trend) : null), [d]);
  const moved = useMemo(() => (d ? whatMoved(d.trend) : null), [d]);

  const totalSpend = d ? d.channelBreakdown.googleAdsSpend + d.channelBreakdown.metaAdsSpend : 0;
  const googleShare = d ? share(d.channelBreakdown.googleAdsSpend, totalSpend) / 100 : 0.5;
  const totalRevenue = d ? d.trend.reduce((s, t) => s + t.revenue, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Blended MER</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Total revenue ÷ ad spend across Google &amp; Meta — immune to platform attribution bias.
          </p>
        </div>
        <DateRangePicker
          dataFrom={hub?.data.dataFrom}
          dataThrough={hub?.data.dataThrough}
          activeRange={hub?.data.window}
        />
      </div>

      {!d || !wow ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {/*
            The verdict, and whether it is moving.

            This was three equal cards — MER, spend, week-over-week — which gave the ratio, the
            denominator and the delta the same weight. The ratio is the page; the rest explains it.
          */}
          <Card className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                Blended MER
                <DataSourceBadge source={mer.source} platform={MODULE_PLATFORMS.blendedMer} />
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                {/* The flagship number wears the brand colour, matching the series that plots it. */}
                <span className="font-display text-4xl font-semibold tabular-nums text-primary">
                  {ratio(d.summary.blendedMER)}
                </span>
                <Delta percent={wow.changePercent} />
              </div>

              {/*
                The operands, always. A change figure on its own is a verdict the reader cannot
                check — the same rule the creative scorecard's bands follow.
              */}
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {ratio(wow.priorAvg)} → {ratio(wow.recentAvg)}{" "}
                <span className="font-sans">avg, prior 7d vs last 7d</span>
              </p>

              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                {d.summary.interpretation}
              </p>
            </div>

            {/* What actually moved — the half of the story a ratio cannot tell on its own. */}
            <div className="grid gap-4 border-t pt-5 sm:grid-cols-2 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <Figure label="Revenue" value={usd(totalRevenue)} change={moved?.revenueChange} />
              <Figure label="Ad spend" value={usd(totalSpend)} change={moved?.spendChange} />

              <div className="sm:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Spend by channel
                </p>
                <div className="mt-2 space-y-1.5">
                  <ChannelBar
                    label="Google Ads"
                    value={d.channelBreakdown.googleAdsSpend}
                    total={totalSpend}
                    className="bg-channel-google"
                  />
                  <ChannelBar
                    label="Meta Ads"
                    value={d.channelBreakdown.metaAdsSpend}
                    total={totalSpend}
                    className="bg-channel-meta"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <Activity className="h-4 w-4 text-primary" aria-hidden />
                MER trend
              </h2>
              {/*
                The floor is stated here because the chart only draws it when the series comes near
                it. A workspace running well clear of 3x would otherwise spend the whole plot
                proving it, and the movement — the thing worth reading — would be squashed flat.
              */}
              <p className="text-xs text-muted-foreground">
                Revenue per dollar of ad spend, by day. Lowest day{" "}
                <span className="font-mono">{ratio(Math.min(...d.trend.map((t) => t.mer)))}</span>,
                against a 3× healthy floor.
              </p>
            </div>
            <div className="mt-4">
              <MerTrendChart trend={d.trend} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <Scale className="h-4 w-4 text-primary" aria-hidden />
                What the ratio is made of
              </h2>
              <p className="max-w-md text-xs text-muted-foreground">
                MER rises when revenue climbs and when spend falls. Those need opposite responses,
                so both sides are drawn.
              </p>
            </div>
            <div className="mt-3">
              <ChartLegend
                items={[
                  { label: "Revenue", className: "bg-foreground" },
                  { label: "Google Ads spend", className: "bg-channel-google" },
                  { label: "Meta Ads spend", className: "bg-channel-meta" },
                ]}
              />
            </div>
            <div className="mt-3">
              <RevenueVsSpendChart trend={d.trend} googleShare={googleShare} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/** A week-over-week delta, with the direction carried by an icon and not by colour alone. */
function Delta({ percent }: { percent: number }) {
  const flat = percent === 0;
  const up = percent > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs tabular-nums",
        flat && "text-muted-foreground",
        !flat && up && "border-success/30 bg-success/10 text-success",
        !flat && !up && "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {signedPercent(percent)}
      <span className="sr-only">week over week</span>
    </span>
  );
}

function Figure({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number | undefined;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">{value}</p>
      {change !== undefined && (
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          {signedPercent(change)} vs prior 7d
        </p>
      )}
    </div>
  );
}

function ChannelBar({
  label,
  value,
  total,
  className,
}: {
  label: string;
  value: number;
  total: number;
  /**
   * The channel's own token. These bars were `bg-primary` for Google and `bg-success` for Meta —
   * the first is the action colour BrandingProvider repaints per workspace, the second means
   * "healthy". Neither says which channel it is, and both tokens already exist for the job.
   */
  className: string;
}) {
  const pct = share(value, total);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right font-mono tabular-nums text-muted-foreground">
        {Math.round(pct)}%
      </span>
      <span className="w-14 shrink-0 text-right font-mono tabular-nums">{usd(value)}</span>
    </div>
  );
}
