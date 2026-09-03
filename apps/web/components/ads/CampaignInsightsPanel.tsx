"use client";
import { AlertTriangle, Table2, Wallet } from "lucide-react";
import type { CampaignInsight, CampaignSummary, WastedSpendFinding } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { cn } from "@/lib/utils/cn";
import { formatDay, rangeLength } from "@/lib/stores/range";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Money that has to be exact, like a per-campaign CPA. */
const usdExact = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/**
 * A conversion rate, to two decimal places.
 *
 * `detectWastedSpend` already prints "Very low conversion rate (0.14%)" in the panel above this
 * table. Until the engine's rounding was widened, `CampaignInsight.conversionRate` could only hold
 * whole percents, so the same campaign read 0.14% in the panel and 0.00% in the table.
 */
const percent = (ratio: number) => `${(ratio * 100).toFixed(2)}%`;

/**
 * The three verdicts, and what to do about each.
 *
 * One vocabulary everywhere: the badge in the table, the legend on the budget bar, and the
 * wasted-spend panel all say the same word for the same thing. The colours are status colours used
 * for status, which is the one job they are reserved for — a campaign returning less than it costs
 * is the definition of `--destructive`, and one clearing the scale threshold is `--success`.
 */
const STATUS: Record<
  CampaignInsight["status"],
  { label: string; badge: string; bar: string; dot: string }
> = {
  scale: {
    label: "Scale",
    badge: "border-success/30 bg-success/10 text-success",
    bar: "bg-success",
    dot: "bg-success",
  },
  healthy: {
    label: "Healthy",
    badge: "border-border bg-muted text-muted-foreground",
    bar: "bg-muted-foreground",
    dot: "bg-muted-foreground",
  },
  wasted: {
    label: "Wasted",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
    bar: "bg-destructive",
    dot: "bg-destructive",
  },
};

/** The advisor's own thresholds, stated once so the verdicts can be checked rather than trusted. */
const SCALE_ROAS = 3;

const ORDER = ["scale", "healthy", "wasted"] as const;

/** `{ from, to }` → "30 days to 17 Jul". */
function windowLabel(period: { from: string; to: string } | null): string | null {
  if (!period) return null;
  const days = rangeLength(period);
  return `${days} day${days === 1 ? "" : "s"} to ${formatDay(period.to)}`;
}

/**
 * Shared campaign surface for the Google Ads and Meta Ads modules — both are computed by the same
 * `@growthos/logic` advisor over the same table, so they get the same reading of it.
 *
 * It used to open with four equal tiles: total spend, account ROAS, and two bare counts ("Wasted
 * campaigns 1", "Scale opportunities 1"). The counts gave a number of campaigns where the decision
 * turns on an amount of money, and the four tiles gave the return, its denominator and two tallies
 * the same weight. `summary.totalConversions` and `summary.blendedCpa` were computed, typed and
 * returned on every request, and never rendered at all.
 */
export function CampaignInsightsPanel({
  campaigns,
  wastedSpend,
  summary,
  period,
}: {
  campaigns: CampaignInsight[];
  wastedSpend: WastedSpendFinding[];
  summary: CampaignSummary;
  period: { from: string; to: string } | null;
}) {
  const returned = campaigns.reduce((s, c) => s + c.conversionValue, 0);
  const window = windowLabel(period);

  // Spend partitioned by verdict — the same total the tile used to state on its own, split by what
  // the advisor says about each part of it.
  const byStatus = ORDER.map((status) => ({
    status,
    spend: campaigns.filter((c) => c.status === status).reduce((s, c) => s + c.cost, 0),
  })).filter((s) => s.spend > 0);
  const total = summary.totalSpend || 1;

  return (
    <div className="space-y-6">
      <Card className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" aria-hidden />
            Account ROAS
          </p>

          {/* The flagship figure wears the brand colour, as blended MER does on Analytics. */}
          <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-primary">
            {summary.blendedRoas.toFixed(2)}×
          </p>

          {/*
            The operands, always — a ratio stated alone is a verdict the reader cannot check. This
            is the same rule the MER hero and the creative scorecard's bands follow.
          */}
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {usd(summary.totalSpend)} spent → {usd(returned)} returned
            {window && <span className="font-sans"> · {window}</span>}
          </p>

          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Revenue attributed by the platform, over the spend that earned it. A campaign clearing{" "}
            {SCALE_ROAS}× is called ready to scale; one returning less than it costs is wasted.
          </p>
        </div>

        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div className="sm:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Where the budget went
            </p>
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {byStatus.map((s) => (
                <div
                  key={s.status}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", STATUS[s.status].bar)}
                  style={{ width: `${(s.spend / total) * 100}%` }}
                />
              ))}
            </div>
            <ul className="mt-2.5 space-y-1">
              {byStatus.map((s) => (
                <li key={s.status} className="flex items-center gap-2 text-xs">
                  <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-[2px]", STATUS[s.status].dot)} />
                  <span className="text-muted-foreground">{STATUS[s.status].label}</span>
                  <span className="ml-auto font-mono tabular-nums">{usd(s.spend)}</span>
                  <span className="w-9 text-right font-mono tabular-nums text-muted-foreground">
                    {Math.round((s.spend / total) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Figure label="Conversions" value={summary.totalConversions.toLocaleString()} />
          <Figure
            label="Cost per conversion"
            value={summary.blendedCpa > 0 ? usdExact(summary.blendedCpa) : "—"}
          />
        </div>
      </Card>

      {wastedSpend.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Wasted spend detected
          </div>
          <ul className="mt-3 space-y-2">
            {wastedSpend.map((f, i) => (
              <li key={i} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <span className="font-medium">{f.campaign}</span>
                  <span className="text-muted-foreground"> — {f.issue}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono font-medium tabular-nums">{usd(f.wastedSpend)}</span>
                  <Badge variant={f.severity === "High" ? "default" : "muted"}>{f.severity}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Table2 className="h-4 w-4 text-primary" aria-hidden />
            Campaigns
          </h2>
          <p className="text-xs text-muted-foreground">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}, highest spend first
          </p>
        </div>
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                {/* Conversion rate: computed on every campaign since the engine was written, never
                    shown — and the figure the wasted-spend panel above quotes back. */}
                <TableHead className="text-right">CVR</TableHead>
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="min-w-[15rem]">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.recommendation}</p>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{usd(c.cost)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{c.conversions}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {c.clicks > 0 ? percent(c.conversionRate) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {c.cpa > 0 ? usdExact(c.cpa) : "—"}
                  </TableCell>
                  {/* ROAS decides the verdict beside it, so it carries the row's weight. */}
                  <TableCell className="text-right font-mono text-base font-medium tabular-nums">
                    {c.roas.toFixed(2)}×
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        STATUS[c.status].badge
                      )}
                    >
                      {STATUS[c.status].label}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
