"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminUserSpend } from "@growthos/types";
import { channelLabel } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { moneyLabel } from "@/components/admin/labels";
import { cn } from "@/lib/utils/cn";

/**
 * What this person is worth, and what they run through the product.
 *
 * Two senses of "spend", kept apart: what they pay **us** (the list price of the workspaces they
 * own) and what they spend on **ads** through every workspace they can reach. Someone paying $79
 * and moving $40,000 a month is a different conversation from someone paying the same and moving
 * nothing, and a single "spend" figure would hide which one you are looking at.
 *
 * **The split is carried by numbers, not by hue.** The app's `--channel-google` and
 * `--channel-meta` tokens are 0.3 ΔE apart under deuteranopia in dark mode — indistinguishable to a
 * red-green colourblind operator, and only 10.2 apart even with full colour vision, under the
 * 15 floor. So the daily chart plots one total series and the "where it goes" breakdown states each
 * figure in text beside a labelled bar. Nothing here depends on telling two blues apart.
 */

const AXIS = {
  tick: { fontSize: 11 },
  stroke: "var(--color-muted-foreground)",
} as const;

/** Compact dollars for an axis: $1.2k rather than $1,240, which would collide at this width. */
function axisMoney(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
}

const shortDate = (d: string) => d.slice(5);

export function UserSpendPanel({
  spend,
  isLoading,
}: {
  spend: AdminUserSpend | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !spend) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const hasAds = spend.daily.length > 0;
  const roas = spend.totalSpend > 0 ? spend.totalRevenue / spend.totalSpend : null;

  return (
    <div className="space-y-6">
      {/*
        A divided line rather than four cards — these are four readings of one account, and each in
        its own bordered box would imply four separate things to act on.
      */}
      <dl className="grid grid-cols-2 divide-x divide-y rounded-lg border sm:grid-cols-4 sm:divide-y-0">
        <Figure
          label="Pays us monthly"
          value={moneyLabel(spend.billingMonthlyCents)}
          hint={
            spend.ownedWorkspaceCount === 0
              ? "They own no workspace, so they pay nothing — they are a member of someone else's account."
              : `List price of the ${spend.ownedWorkspaceCount} workspace${spend.ownedWorkspaceCount === 1 ? "" : "s"} they own.`
          }
        />
        <Figure
          label="Ad spend, 30 days"
          value={hasAds ? moneyLabel(spend.totalSpend * 100) : "—"}
          hint="Across every workspace they can reach."
        />
        <Figure
          label="Attributed revenue"
          value={hasAds ? moneyLabel(spend.totalRevenue * 100) : "—"}
        />
        <Figure
          label="Return on spend"
          value={roas ? `${roas.toFixed(1)}x` : "—"}
          hint="Attributed revenue divided by ad spend over the same window."
        />
      </dl>

      {!hasAds ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          No advertising data. Either nothing is connected in their workspaces, or no spend has been
          recorded yet — the Connections tab on each account says which.
        </p>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="font-display text-base font-semibold tracking-tight">
                Ad spend, day by day
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                {spend.windowFrom} to {spend.windowTo}
              </p>
            </div>

            {/*
              One series, so no legend — the heading names it. Total spend rather than a stack per
              channel: see the note at the top of this file for why the two channel hues must not be
              asked to carry meaning on their own.
            */}
            <div className="mt-4 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spend.daily} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="user-spend-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
                  <YAxis tickFormatter={axisMoney} width={52} {...AXIS} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--color-muted-foreground)" }}
                    formatter={(v) => [moneyLabel(Number(v) * 100), "Spend"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#user-spend-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Breakdown
              title="Where it goes"
              caption="By advertising channel."
              rows={spend.byPlatform.map((p) => ({
                key: p.platform,
                // Slugs never reach the screen — CLAUDE.md.
                label: channelLabel(p.platform),
                value: p.spend,
              }))}
              total={spend.totalSpend}
            />
            <Breakdown
              title="Which account"
              caption="Spend attributed to each workspace they belong to."
              rows={spend.byWorkspace.map((w) => ({
                key: w.workspaceId,
                label: w.name,
                value: w.spend,
                href: `/admin/workspaces/${w.workspaceId}`,
              }))}
              total={spend.totalSpend}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-4 py-3.5" title={hint}>
      <dd className="font-mono text-xl font-semibold tabular-nums">{value}</dd>
      <dt className="mt-0.5 text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

/**
 * A labelled bar with its figure printed beside it.
 *
 * The bar gives the shape at a glance and the number gives the answer; neither depends on
 * distinguishing one hue from another, which is the property that matters here.
 */
function Breakdown({
  title,
  caption,
  rows,
  total,
}: {
  title: string;
  caption: string;
  rows: { key: string; label: string; value: number; href?: string }[];
  total: number;
}) {
  return (
    <Card className="p-5">
      <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>

      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const share = total > 0 ? (r.value / total) * 100 : 0;
          return (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                {r.href ? (
                  <a
                    href={r.href}
                    className="min-w-0 truncate rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {r.label}
                  </a>
                ) : (
                  <span className="min-w-0 truncate">{r.label}</span>
                )}
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {moneyLabel(r.value * 100)}
                  <span className="ml-2 text-muted-foreground">{share.toFixed(0)}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full bg-primary")} style={{ width: `${share}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
