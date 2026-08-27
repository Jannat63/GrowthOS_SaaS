"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileDown,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@growthos/ui/components/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { channelLabel, type ReportChannel, type ReportMetric } from "@growthos/logic";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useReport, useReportPeriods } from "@/lib/hooks/useReport";
import { useDownloadReportPdf } from "@/lib/hooks/useDownloadReportPdf";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";

/**
 * The Weekly Intelligence Report.
 *
 * The one screen in the product that is also a deliverable: the same `WeeklyReport` object renders
 * here and into the white-labelled customer PDF (apps/api/src/pdf-report.ts). It is laid out as an
 * issue of something rather than a dashboard tab — masthead, verdict, evidence, the move, what's
 * next — because that ordering is what a reader of a report expects, and because the operator
 * reading it on screen and the client reading the PDF want the same sequence.
 *
 * Two things the page must never do, both of which it used to:
 *  - print the calendar week above figures measured over a different window (`period`, not
 *    `weekStart`, is what the reader is looking at), and
 *  - render a ratio that does not exist as `0.00x`, which ranked organic as the worst channel a
 *    business has.
 */

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Break-even on ad spend. The only ROAS threshold that means the same thing for every business. */
const BREAK_EVEN = 1;

function formatDay(iso: string, withYear = false): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export default function IntelligencePage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  // null = the current week, which is regenerated on read. Any other value is served verbatim out
  // of the archive, so a past week cannot rewrite itself against newer data.
  const [week, setWeek] = useState<string | null>(null);
  const { data: report } = useReport(workspaceId, week);
  const { data: periods } = useReportPeriods(workspaceId);
  const r = report?.data;
  const downloadPdf = useDownloadReportPdf(workspaceId);

  return (
    <div className="animate-rise space-y-6">
      <Masthead
        period={r?.period ?? null}
        weekStart={r?.weekStart}
        source={report?.source}
        weeks={periods?.data ?? []}
        week={week}
        onWeek={setWeek}
        onDownload={() => downloadPdf.mutate()}
        downloading={downloadPdf.isPending}
        downloadError={
          downloadPdf.isError
            ? downloadPdf.error instanceof Error
              ? downloadPdf.error.message
              : "Could not generate the PDF."
            : null
        }
      />

      {!r ? (
        <PageSkeleton />
      ) : (
        <>
          {/* ── The verdict ──────────────────────────────────────────────────
              One sentence, set larger than anything else on the page. It states the direction of
              blended efficiency; the tiles below give it its magnitude. */}
          <p className="max-w-3xl font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {r.headline}
          </p>

          {/* ── The numbers ──────────────────────────────────────────────────
              Four figures, each with the same week a week earlier. Every one of these was a bare
              value before, which left the reader no way to answer "is this good?". */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Blended MER"
              value={`${r.blendedMer.value.toFixed(2)}x`}
              metric={r.blendedMer}
              hint="All revenue, including organic, over ad spend"
              accent
            />
            <MetricTile
              label="Paid ROAS"
              value={`${r.paidRoas.value.toFixed(2)}x`}
              metric={r.paidRoas}
              hint="Ad-attributed revenue only"
            />
            <MetricTile
              label="Total revenue"
              value={usd(r.revenue.value)}
              metric={r.revenue}
              hint="Every channel combined"
            />
            <MetricTile
              label="Ad spend"
              value={usd(r.adSpend.value)}
              metric={r.adSpend}
              hint="Google + Meta combined"
              // Spending more is neither good nor bad on its own — it reads against what it
              // returned, which is what the MER tile says. Colouring it green would tell the
              // reader that spending more is a win.
              neutral
            />
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{r.summary}</p>

          {r.budgetReallocation && <TheMove move={r.budgetReallocation} />}

          <ChannelBreakdown channels={r.channelBreakdown} />

          <NextUp
            opportunities={r.topOpportunities}
            open={r.openOpportunities}
          />
        </>
      )}
    </div>
  );
}

// ── Masthead ─────────────────────────────────────────────────────────────────

/**
 * Title, the window the figures actually cover, and the controls.
 *
 * The period is the fix for the page's oldest bug: it used to print `weekStart` — a calendar week —
 * over numbers drawn from the newest week that HAS data, which on any seeded or lagging workspace
 * is a different week entirely.
 */
function Masthead({
  period,
  weekStart,
  source,
  weeks,
  week,
  onWeek,
  onDownload,
  downloading,
  downloadError,
}: {
  period: { from: string; to: string } | null;
  weekStart: string | undefined;
  source: "live" | "mock" | undefined;
  weeks: { weekStart: string }[];
  week: string | null;
  onWeek: (week: string | null) => void;
  onDownload: () => void;
  downloading: boolean;
  downloadError: string | null;
}) {
  // weeks is newest-first, so index 0 is the current report and stepping back means stepping up
  // the array. Rendered only with a real archive behind it — a stepper with one week in it is two
  // permanently disabled arrows.
  const index = week ? weeks.findIndex((w) => w.weekStart === week) : 0;
  const canStep = weeks.length > 1 && index >= 0;
  const older = canStep ? weeks[index + 1] : undefined;
  const newer = canStep && index > 0 ? weeks[index - 1] : undefined;

  return (
    <div className="border-b pb-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {period ? (
              <>
                {formatDay(period.from)} &ndash; {formatDay(period.to, true)}
              </>
            ) : weekStart ? (
              <>Week of {formatDay(weekStart, true)}</>
            ) : (
              <span className="inline-block h-3 w-40 animate-pulse rounded bg-muted align-middle" />
            )}
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
            Weekly Intelligence Report
          </h1>
          <Freshness dataThrough={period?.to ?? null} />
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {canStep && (
              <div className="mr-1 flex items-center rounded-md border">
                <StepButton
                  label="Previous week"
                  disabled={!older}
                  onClick={() => older && onWeek(older.weekStart)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </StepButton>
                <StepButton
                  label="Next week"
                  disabled={!newer}
                  // Stepping back to the newest week clears the pin, so the report regenerates
                  // rather than serving a snapshot of the week already in progress.
                  onClick={() => newer && onWeek(index - 1 === 0 ? null : newer.weekStart)}
                >
                  <ChevronRight className="h-4 w-4" />
                </StepButton>
              </div>
            )}
            {source && <DataSourceBadge source={source} platform={MODULE_PLATFORMS.crossChannel} />}
            <Button variant="outline" size="sm" disabled={downloading} onClick={onDownload}>
              <FileDown className="h-3.5 w-3.5" />
              {downloading ? "Generating…" : "Download PDF"}
            </Button>
          </div>
          {downloadError && <p className="text-xs text-destructive">{downloadError}</p>}
        </div>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** How old the newest day in the window is. A stale report must not look like a current one. */
function Freshness({ dataThrough }: { dataThrough: string | null }) {
  if (!dataThrough) return null;
  const when = new Date(`${dataThrough}T00:00:00Z`);
  const daysBehind = Math.floor((Date.now() - when.getTime()) / 86_400_000);
  if (daysBehind < 2) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span className={cn(daysBehind >= 7 && "text-warning")}>
        Measured {daysBehind} days ago — the latest data this workspace has
      </span>
    </p>
  );
}

// ── Metrics ──────────────────────────────────────────────────────────────────

function Delta({ metric, neutral = false }: { metric: ReportMetric; neutral?: boolean }) {
  if (metric.deltaPct === null) {
    return <span className="text-xs text-muted-foreground">No prior week</span>;
  }
  const Icon = metric.deltaPct > 0 ? TrendingUp : TrendingDown;
  const tone =
    neutral || metric.deltaPct === 0
      ? "text-muted-foreground"
      : metric.deltaPct > 0
        ? "text-success"
        : "text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", tone)}>
      {metric.deltaPct !== 0 && <Icon className="h-3 w-3" />}
      {metric.deltaPct > 0 ? "+" : ""}
      {metric.deltaPct}% vs prior week
    </span>
  );
}

function MetricTile({
  label,
  value,
  metric,
  hint,
  accent = false,
  neutral = false,
}: {
  label: string;
  value: string;
  metric: ReportMetric;
  hint: string;
  accent?: boolean;
  neutral?: boolean;
}) {
  return (
    <Card className={cn("flex flex-col p-5", accent && "ring-1 ring-primary/15")}>
      <p
        className={cn(
          "text-xs font-medium uppercase tracking-wide",
          accent ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      <div className="mt-1.5">
        <Delta metric={metric} neutral={neutral} />
      </div>
      <p className="mt-auto pt-3 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

// ── The move ─────────────────────────────────────────────────────────────────

/**
 * The reallocation, as something a person can act on.
 *
 * It previously stated an amount with no derivation and offered nothing to do about it. `basis`
 * carries the rule that produced the figure, and the queue is where the work actually happens.
 */
function TheMove({
  move,
}: {
  move: { fromChannel: string; toChannel: string; amount: number; reason: string; basis: string };
}) {
  return (
    <section className="space-y-3">
      <SectionHeading>The move</SectionHeading>
      <Card className="border-primary/30 bg-primary/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Wallet className="h-3.5 w-3.5" />
              Reallocation
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-2 font-display text-lg font-semibold tracking-tight">
              Shift <span className="tabular-nums">{usd(move.amount)}</span> from
              <Badge variant="muted">{channelLabel(move.fromChannel)}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge>{channelLabel(move.toChannel)}</Badge>
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {move.reason}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">{move.basis}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/recommendations">
              Open the queue <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}

// ── Channel breakdown ────────────────────────────────────────────────────────

/** Which channel a row belongs to, for the share bar's colour. */
function channelBarClass(slug: string): string {
  if (slug === "google_ads") return "bg-channel-google";
  if (slug === "meta_ads") return "bg-channel-meta";
  if (slug === "organic" || slug === "seo" || slug === "google_search_console")
    return "bg-channel-seo";
  return "bg-muted-foreground";
}

function ChannelBreakdown({ channels }: { channels: ReportChannel[] }) {
  const showsEstimate = channels.some((c) => c.modelled);
  return (
    <section className="space-y-3">
      <SectionHeading>Channel breakdown</SectionHeading>
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">Channel</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead className="text-right">CPA</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No channel data yet — connect a channel to populate your report.
                </TableCell>
              </TableRow>
            ) : (
              channels.map((c) => <ChannelRow key={c.channel} channel={c} />)
            )}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">
        ROAS under {BREAK_EVEN.toFixed(2)}x means the channel returns less than it spends.
        {showsEstimate &&
          " Organic revenue is estimated from the share of total revenue not attributed to ads; clicks are measured."}
      </p>
    </section>
  );
}

function ChannelRow({ channel: c }: { channel: ReportChannel }) {
  const isPaid = c.paid !== false;
  // An em dash, never "0" or "0.00x": these figures do not exist for a channel with no ad spend,
  // and rendering them as zero ranks the cheapest channel a business has as its worst.
  const none = <span className="text-muted-foreground/50">&mdash;</span>;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{channelLabel(c.channel)}</div>
        <div className="mt-1.5 flex items-center gap-2">
          {/* The share bar fills the width the numeric columns used to strand, and turns "which
              channel matters" into something readable without arithmetic. */}
          <span className="h-1.5 w-full max-w-[10rem] overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full", channelBarClass(c.channel))}
              style={{ width: `${Math.round(c.revenueShare * 100)}%` }}
            />
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(c.revenueShare * 100)}%
          </span>
        </div>
        {(c.clicks || c.modelled) && (
          <div className="mt-1 text-xs text-muted-foreground/80">
            {[
              c.clicks ? `${c.clicks.toLocaleString("en-US")} clicks` : null,
              c.modelled ? "estimated" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{isPaid ? usd(c.spend) : none}</TableCell>
      <TableCell className="text-right tabular-nums">{usd(c.revenue)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {isPaid && c.conversions ? c.conversions.toLocaleString("en-US") : none}
      </TableCell>
      <TableCell className="text-right tabular-nums">{c.cpa === null ? none : usd(c.cpa)}</TableCell>
      <TableCell className="text-right">
        {c.roas === null ? (
          none
        ) : (
          <div className="flex items-center justify-end gap-2">
            {c.roasDelta !== null && c.roasDelta !== 0 && (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  c.roasDelta > 0 ? "text-success" : "text-destructive"
                )}
              >
                {c.roasDelta > 0 ? "+" : "−"}
                {Math.abs(c.roasDelta).toFixed(2)}
              </span>
            )}
            {/* Encodes profitability, not rank. The badge used to be ember whenever a channel beat
                the blended average — so a channel at 1.30x against a 1.25x blend read as "good"
                despite barely clearing break-even. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={c.roas >= BREAK_EVEN ? "success" : "destructive"}
                  className="cursor-help tabular-nums"
                >
                  {c.roas.toFixed(2)}x
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {/* Cents matter here: `usd()` rounds to whole dollars, which would render a
                    2.21x channel as "returns $2 for every $1". */}
                {c.roas >= BREAK_EVEN
                  ? `Returns $${c.roas.toFixed(2)} for every $1 spent.`
                  : `Returns $${c.roas.toFixed(2)} for every $1 spent — below break-even.`}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── What's next ──────────────────────────────────────────────────────────────

function NextUp({
  opportunities,
  open,
}: {
  opportunities: {
    id?: string;
    type?: string;
    title: string;
    body: string;
    sourceChannel?: string;
    targetChannel?: string;
    priority?: number;
  }[];
  open: number;
}) {
  const remaining = open - opportunities.length;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <SectionHeading>Next up</SectionHeading>
        {open > 0 && (
          <Link
            href="/recommendations"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            All {open} open <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {opportunities.length === 0 ? (
        <Card className="border-dashed p-8 text-center">
          <p className="text-sm font-medium">No open opportunities this week</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New cross-channel opportunities appear here as your data updates.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {opportunities.map((o, i) => (
            <OpportunityCard key={o.id ?? i} opportunity={o} />
          ))}
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {remaining} more {remaining === 1 ? "recommendation is" : "recommendations are"} waiting
              in the queue.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Where each recommendation type is actually worked — the same routing the Growth Hub uses. */
const TYPE_HREF: Record<string, string> = {
  paid_to_organic: "/content-pipeline",
  organic_to_paid: "/creative-queue",
  fatigue_alert: "/fatigue-monitor",
  cross_channel: "/recommendations",
};

function OpportunityCard({
  opportunity: o,
}: {
  opportunity: {
    id?: string;
    type?: string;
    title: string;
    body: string;
    sourceChannel?: string;
    targetChannel?: string;
    priority?: number;
  };
}) {
  const crossChannel =
    o.sourceChannel &&
    o.targetChannel &&
    o.sourceChannel !== o.targetChannel &&
    o.sourceChannel !== "unified";

  const body = (
    <Card className="flex items-start gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-secondary/40">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Lightbulb className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{o.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
        {/* The bridge and the score the queue is actually ordered by. Without them the cards read
            as three unranked, unattributed rows that happened to be in some order. */}
        {(crossChannel || o.priority !== undefined) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {crossChannel && (
              <span className="font-medium text-foreground/70">
                {channelLabel(o.sourceChannel!)} → {channelLabel(o.targetChannel!)}
              </span>
            )}
            {crossChannel && o.priority !== undefined && " · "}
            {o.priority !== undefined && <span className="tabular-nums">priority {o.priority}</span>}
          </p>
        )}
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Card>
  );

  return <Link href={(o.type && TYPE_HREF[o.type]) ?? "/recommendations"}>{body}</Link>;
}

// ── Shared ───────────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  );
}

/**
 * Per-region skeletons rather than one slab.
 *
 * The page rendered a single `h-64` block for everything, so arrival was a hard layout jump from
 * one grey rectangle to a full page.
 */
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4 max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-4 w-2/3 max-w-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
