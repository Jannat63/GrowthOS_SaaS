"use client";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MerTrendPoint } from "@growthos/types";
import { usd } from "./merFormat";

/**
 * Two charts, one date axis — not one chart with two y-scales.
 *
 * MER is a ratio around 10x; revenue and spend are dollars in the thousands and hundreds. Putting
 * them on one plot needs a second y-axis, which lets any story be drawn by sliding one scale
 * against the other. Stacked as small multiples over the same dates, the reader compares by
 * position instead.
 *
 * Colour rule for this module:
 *
 * - **Ember (`--primary`) is blended MER itself.** It is the product's flagship metric — "one
 *   blended efficiency number, not three that disagree" — and the Growth Hub already draws this
 *   exact series in ember (`growth-hub/page.tsx`, `text-primary` on the card + `currentColor`).
 *   Drawing the same metric white here and ember there was an inconsistency, not a safety measure.
 *   The white-label caveat that moved `OrganicTraffic` off `--primary` does not transfer: that
 *   series shares a plot with others and needed to stay distinguishable from them, whereas MER is
 *   alone in its chart, and a workspace that re-brands the product wants its colour on its headline
 *   number.
 * - **Channel tokens are the split.** Google and Meta spend must stay distinguishable from each
 *   other and from the brand, whatever a tenant repaints `--primary` to.
 * - **Neutral is a supporting aggregate.** Revenue sits beside channel-coloured spend, so it stays
 *   `--foreground` rather than competing with either.
 */

const AXIS = {
  tick: { fontSize: 11 },
  stroke: "var(--color-muted-foreground)",
} as const;

const TOOLTIP = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "var(--color-muted-foreground)" },
} as const;

const shortDate = (d: string) => d.slice(5);

/** The healthy floor MER is judged against, from `calculateBlendedMER`'s bands. */
const HEALTHY_MER = 3;

/**
 * A y-domain that fits the data, and whether the benchmark still fits inside it.
 *
 * Recharts anchors an area at zero, which is right for a magnitude and wrong for a ratio that never
 * approaches it: seeded MER runs 21x-39x, so more than half the plot was empty and a 1.8x swing was
 * squashed into the top third — a series that genuinely moves, drawn as though it did not.
 *
 * The floor is only drawn when it is actually in view. Rendering a 3x reference under a series that
 * never drops below 21x forces the zero-baseline back and spends the whole plot proving something
 * the headline already says; below the range it becomes a sentence instead.
 */
function merDomain(trend: MerTrendPoint[]): { domain: [number, number]; showFloor: boolean } {
  const values = trend.map((t) => t.mer);
  if (values.length === 0) return { domain: [0, HEALTHY_MER * 2], showFloor: true };
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Within reach of the floor: keep the floor and a zero-ish baseline, so the comparison is drawn.
  if (min <= HEALTHY_MER * 1.5) {
    return { domain: [0, Math.ceil(max * 1.1)], showFloor: true };
  }
  const pad = Math.max((max - min) * 0.15, 0.5);
  return { domain: [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)], showFloor: false };
}

export function MerTrendChart({ trend }: { trend: MerTrendPoint[] }) {
  const { domain, showFloor } = merDomain(trend);
  return (
    <div className="h-56 w-full text-primary">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="merFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} />
          <YAxis {...AXIS} width={44} domain={domain} tickFormatter={(v: number) => `${v}×`} />
          <Tooltip
            {...TOOLTIP}
            formatter={(v) => [`${Number(v).toFixed(2)}×`, "Blended MER"]}
          />
          {/* The floor the metric is judged against — semantic, so it keeps the status colour. */}
          {showFloor && (
            <ReferenceLine
              y={HEALTHY_MER}
              stroke="var(--color-success)"
              strokeDasharray="4 4"
              label={{
                value: `Healthy ${HEALTHY_MER}×`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--color-success)",
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="mer"
            stroke="currentColor"
            strokeWidth={2}
            fill="url(#merFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * What the ratio is made of.
 *
 * `MerTrendPoint` has carried `revenue` and `spend` since the endpoint was written — both computed
 * on the API and in the offline mock, both returned, neither ever rendered. Only the ratio was
 * plotted, and a ratio cannot say whether it rose because revenue climbed or because spend was cut.
 * Those are opposite situations with opposite responses.
 *
 * Spend stacks by channel so the mix is visible in the same read; revenue is a line above it, and
 * the gap between them is the margin.
 */
export function RevenueVsSpendChart({ trend }: { trend: MerTrendPoint[] }) {
  // The split arrives per day. It used to be rebuilt here from the window-wide Google share, which
  // drew every bar at the same proportion whatever happened that day - a day Google did not run at
  // all still showed a Google segment. The API had the real figures the whole time; it summed them
  // into `spend` before returning, and now carries both.
  const data = trend.map((t) => ({
    date: t.date,
    revenue: t.revenue,
    googleSpend: t.googleSpend,
    metaSpend: t.metaSpend,
  }));

  return (
    <div className="space-y-1">
      {/*
        Small multiples, not one plot.

        Revenue and spend are both dollars, so one axis looked defensible — but at a 27x ratio the
        spend bars came out about two pixels tall against a $6k revenue axis and simply were not
        there, which is the opposite of the point. A second y-axis would be worse: two scales slid
        against each other can be made to tell any story. Stacked panels share the date axis, so the
        reader compares shape and timing, and each side keeps a scale it is actually legible on.
      */}
      <Panel label="Revenue">
        <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }} syncId="mer">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" hide />
          <YAxis {...AXIS} width={52} tickFormatter={money} />
          <Tooltip {...TOOLTIP} formatter={(v) => [usd(Number(v)), "Revenue"]} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-foreground)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </Panel>

      <Panel label="Ad spend">
        <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }} syncId="mer">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} />
          <YAxis {...AXIS} width={52} tickFormatter={money} />
          <Tooltip
            {...TOOLTIP}
            formatter={(v, name) => [
              usd(Number(v)),
              name === "googleSpend" ? "Google Ads" : "Meta Ads",
            ]}
          />
          {/* A 1px surface-coloured edge keeps the two stacked segments from fusing. */}
          <Bar
            dataKey="googleSpend"
            stackId="spend"
            fill="var(--color-channel-google)"
            stroke="var(--color-card)"
            strokeWidth={1}
          />
          <Bar
            dataKey="metaSpend"
            stackId="spend"
            fill="var(--color-channel-meta)"
            stroke="var(--color-card)"
            strokeWidth={1}
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </Panel>
    </div>
  );
}

/**
 * Compact dollars for an axis tick.
 *
 * `Math.round(v / 1000)` printed two different ticks as the same label — a revenue axis running to
 * $2k showed "$2k" at both 1,500 and 2,000, so two gridlines claimed the same value. One decimal,
 * with a bare `.0` trimmed, keeps adjacent ticks distinct without adding noise.
 */
const money = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1).replace(/\.0$/, "")}k` : `$${Math.round(v)}`;

/** One band of a small-multiple stack: its own scale, labelled so the axis is never ambiguous. */
function Panel({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <div>
      <p className="pl-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Identity is never colour-alone: every series is named next to its swatch. */
export function ChartLegend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[2px] ${i.className}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
