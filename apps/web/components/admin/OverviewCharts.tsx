"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlatformOverview } from "@growthos/types";
import { channelLabel } from "@growthos/logic";
import { moneyLabel } from "@/components/admin/labels";
import { cn } from "@/lib/utils/cn";

/**
 * The overview's charts.
 *
 * Every one of them is a **single series on a single axis**. That is not minimalism for its own
 * sake: it means none of them needs a legend, and it is what lets the Google/Meta split be drawn at
 * all. Those two tokens sit 0.3 ΔE apart under deuteranopia against the dark surface — the same
 * colour to a red-green colourblind operator — so they must never be adjacent in one plot. Drawn as
 * small multiples, each with its own heading and its own axis, the hue carries no load and the
 * comparison is made by position instead.
 */

const AXIS = { tick: { fontSize: 11 }, stroke: "var(--color-muted-foreground)" } as const;

export const TOOLTIP = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
} as const;

/** `$1.2k`, `$41k`. A full `$1,240` collides with its neighbour at these widths. */
export function axisMoney(v: number): string {
  const n = Math.abs(v);
  if (n >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(v / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
}

/** `4.9M`, `238k`. Impressions and clicks run to seven digits and are read as magnitudes. */
export function compact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

const shortDate = (d: string) => d.slice(5);

/**
 * Platform-wide spend, day by day. The page's one bold element.
 *
 * `minTickGap` rather than every date: thirty labels on one axis is a grey smear, and the shape of
 * the line is what this chart is for.
 */
export function SpendArea({ data }: { data: PlatformOverview["spendDaily"] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="ov-spend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            minTickGap={40}
            {...AXIS}
            tickLine={false}
          />
          <YAxis tickFormatter={axisMoney} width={56} {...AXIS} tickLine={false} axisLine={false} />
          <Tooltip {...TOOLTIP} formatter={(v) => [moneyLabel(Number(v) * 100), "Spend"]} />
          <Area
            type="monotone"
            dataKey="spend"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#ov-spend)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * One channel's spend over the same dates as the other.
 *
 * Small multiples, not a stack — see the note at the top of this file. Each keeps its channel token
 * because here the colour is decoration on top of a heading that already names the channel, rather
 * than the only thing telling two series apart.
 */
export function ChannelSpark({
  data,
  channel,
  total,
}: {
  data: PlatformOverview["spendByChannelDaily"];
  channel: "google" | "meta";
  total: number;
}) {
  const stroke =
    channel === "google" ? "var(--color-channel-google)" : "var(--color-channel-meta)";
  const slug = channel === "google" ? "google_ads" : "meta_ads";

  return (
    <div className="min-w-0 p-5">
      <div className="flex items-baseline justify-between gap-4">
        {/* Slugs never reach the screen — CLAUDE.md. */}
        <h3 className="font-display text-sm font-semibold tracking-tight">{channelLabel(slug)}</h3>
        <span className="font-mono text-xs tabular-nums">{moneyLabel(total * 100)}</span>
      </div>
      <div className="mt-3 h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`ov-${channel}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <Tooltip
              {...TOOLTIP}
              labelFormatter={(d) => String(d)}
              formatter={(v) => [moneyLabel(Number(v) * 100), "Spend"]}
            />
            <Area
              type="monotone"
              dataKey={channel}
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#ov-${channel})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Return on spend: attributed revenue divided by spend, per day.
 *
 * Neutral rather than ember. In this console ember is the operator's own actions and the one
 * flagship series, which on this page is spend — a supporting aggregate drawn in the same colour
 * would claim equal billing with it. Same rule the customer app's MER module follows.
 */
export function ReturnLine({ data }: { data: PlatformOverview["spendDaily"] }) {
  const points = data.map((d) => ({
    date: d.date,
    ratio: d.spend > 0 ? Math.round((d.revenue / d.spend) * 100) / 100 : 0,
  }));

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={48} {...AXIS} tickLine={false} />
          <YAxis
            width={36}
            tickFormatter={(v) => `${v}x`}
            // A ratio never approaches zero here, so anchoring the axis at it would flatten every
            // real movement into the top third of the plot.
            domain={["dataMin - 1", "dataMax + 1"]}
            {...AXIS}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip {...TOOLTIP} formatter={(v) => [`${Number(v).toFixed(2)}x`, "Return"]} />
          <Line
            type="monotone"
            dataKey="ratio"
            stroke="var(--color-foreground)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * People joining, as a running total across the window.
 *
 * It was thirty daily bars, and on a real signup pattern twenty-four of them were zero — a chart
 * that spent most of its width proving nothing happened, with the whole story crushed into two
 * spikes. A cumulative line has a shape on every dataset, because it only ever goes up, and it
 * answers the question the panel is actually asking: is this growing, and how fast.
 *
 * The total starts at zero rather than at the platform's headcount. Anchoring to "everyone who has
 * ever signed up" would be wrong the moment someone picks a window in the past — the line would
 * still end at today's number.
 */
export function GrowthArea({ data }: { data: PlatformOverview["growthDaily"] }) {
  let running = 0;
  const points = data.map((d) => {
    running += d.users;
    return { date: d.date, total: running, added: d.users };
  });

  return (
    <div className="h-28 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ov-growth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={48} {...AXIS} tickLine={false} />
          <YAxis width={28} allowDecimals={false} {...AXIS} tickLine={false} axisLine={false} />
          <Tooltip
            {...TOOLTIP}
            formatter={(v, _n, item) => {
              const added = (item?.payload as { added?: number } | undefined)?.added ?? 0;
              return [`${v} total${added > 0 ? ` (+${added})` : ""}`, "People"];
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#ov-growth)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * A labelled bar with its figure printed beside it.
 *
 * Used wherever a split has to be read exactly — channels, campaigns, recommendation outcomes. The
 * bar gives the shape at a glance and the number gives the answer, and neither depends on telling
 * one hue from another.
 */
export function BarList({
  rows,
  tone = "primary",
}: {
  rows: { key: string; label: string; sub?: string; value: string; share: number }[];
  tone?: "primary" | "muted";
}) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate">
              {r.label}
              {r.sub && <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span>}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums">
              {r.value}
              <span className="ml-2 text-muted-foreground">{r.share.toFixed(0)}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full", tone === "primary" ? "bg-primary" : "bg-muted-foreground/50")}
              style={{ width: `${Math.min(100, r.share)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
