// Intelligence Engine V1 (M3 P3.4) — deterministic budget reallocation + weekly report. Ported from
// legacy intelligence-service/app/budget_and_reports.py. Template-first (D4); no LLM dependency.
//
// `channel` on the way in is a slug (`google_ads`); every sentence built here is read by a customer
// and rendered into the PDF, so it goes out through `channelLabel()`.
import { channelLabel } from "./channels.js";

export interface ChannelPerformance {
  channel: string;
  /** Ad spend over the period. An organic channel has none — see `paid`. */
  spend: number;
  /** Revenue credited to this channel. */
  revenue: number;
  /** Conversions attributed to this channel. Organic has none: Search Console reports clicks. */
  conversions?: number;
  /** Organic clicks — the only volume metric Search Console gives us. */
  clicks?: number;
  /**
   * Whether this channel buys media. Defaults to true, since every caller that existed before
   * organic did passed an ad platform.
   *
   * Load-bearing rather than cosmetic. With a spend of 0, `revenue / spend` is not "0.00x ROAS" —
   * it is undefined. Treating it as 0 ranked organic, usually the most efficient channel a
   * business has, as the worst performer on the page, and made it the channel
   * `recommendBudgetReallocation` proposed taking budget *away* from.
   */
  paid?: boolean;
  /**
   * True when `revenue` is derived rather than reported. Organic revenue is the blended-revenue
   * remainder (see REVENUE_FACTOR in apps/api/src/analytics.ts), not a figure any platform handed
   * us, and a report a customer reads has to mark which of its numbers are estimates.
   */
  modelled?: boolean;
}

export interface BudgetReallocation {
  fromChannel: string;
  toChannel: string;
  amount: number;
  reason: string;
  /**
   * How `amount` was arrived at, in one plain sentence. The figure is a fixed fraction of one
   * channel's spend; without the rule beside it the reader has a dollar amount from nowhere.
   */
  basis: string;
}

/** A figure paired with the same figure over the preceding period of equal length. */
export interface ReportMetric {
  value: number;
  /** null when there is no prior period to compare against. */
  previous: number | null;
  /** Percent change vs `previous`. null when `previous` is absent or zero — no change is definable. */
  deltaPct: number | null;
}

/** The inclusive span of days a report's figures were measured over. */
export interface ReportPeriod {
  from: string;
  to: string;
}

export interface ReportChannel extends ChannelPerformance {
  /** revenue / spend, or null for a channel that buys no media. */
  roas: number | null;
  /** spend / conversions, or null without both. */
  cpa: number | null;
  /** 0..1 share of total revenue — what fills the bar in the breakdown table. */
  revenueShare: number;
  /** The same channel over the preceding period. null when it did not run then. */
  previous: { spend: number; revenue: number; roas: number | null } | null;
  /** Absolute ROAS change vs `previous`, in multiples. null when either side is undefined. */
  roasDelta: number | null;
}

export interface ReportOpportunity {
  title: string;
  body: string;
  /**
   * The recommendation this came from. Carried so a card in the report can open the actual queue
   * item — without it the opportunities are unclickable, unranked, and unattributed text.
   */
  id?: string;
  type?: string;
  sourceChannel?: string;
  targetChannel?: string;
  /** `compositeScore` — what the queue is actually ordered by. */
  priority?: number;
}

export interface WeeklyReport {
  /**
   * The calendar week this report is filed under, and the archive's uniqueness key. NOT necessarily
   * what it measures — see `period`.
   */
  weekStart: string;
  /**
   * The window the figures were actually measured over.
   *
   * Separate from `weekStart` on purpose. The archive is keyed by calendar week so there is exactly
   * one report per week, but the data window is anchored to the newest day that HAS data. A seeded
   * or lagging workspace's numbers are weeks older than "this week", and a header printing the
   * calendar week above them was simply wrong about what the reader was looking at.
   */
  period: ReportPeriod | null;
  /** One sentence: the strongest true thing about the period. */
  headline: string;
  /** The supporting paragraph. Deliberately does not restate the headline figures. */
  summary: string;
  /**
   * Blended revenue / ad spend — the same figure /analytics and the Growth Hub call MER.
   *
   * This used to be ad-attributed revenue over ad spend and was still labelled "blended", so the
   * Intelligence page and the Growth Hub reported the same week differently (by exactly
   * REVENUE_FACTOR), and the wrong one of the two was the one that went into the customer's PDF.
   */
  blendedMer: ReportMetric;
  /** Ad-attributed revenue / ad spend. What the paid channel rows roll up to. */
  paidRoas: ReportMetric;
  /** Total revenue across every channel, organic included. */
  revenue: ReportMetric;
  adSpend: ReportMetric;
  channelBreakdown: ReportChannel[];
  topOpportunities: ReportOpportunity[];
  /** Every pending recommendation, so a capped list can honestly say "3 of 11". */
  openOpportunities: number;
  budgetReallocation: BudgetReallocation | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (n: number) => `${Math.abs(Math.round(n))}%`;

/** Defaults to true: a channel is an ad platform unless it says otherwise. */
const isPaid = (c: ChannelPerformance) => c.paid !== false;

/** A ratio that does not exist is null, never 0 — see the note on `ChannelPerformance.paid`. */
const ratio = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? round2(numerator / denominator) : null;

const roasOf = (c: ChannelPerformance): number | null =>
  isPaid(c) ? ratio(c.revenue, c.spend) : null;

const sumBy = (cs: ChannelPerformance[], f: (c: ChannelPerformance) => number) =>
  cs.reduce((s, c) => s + f(c), 0);

function metric(value: number, previous: number | null): ReportMetric {
  const deltaPct =
    previous === null || previous === 0 ? null : Math.round(((value - previous) / previous) * 100);
  return { value: round2(value), previous: previous === null ? null : round2(previous), deltaPct };
}

/** A metric built from two ratios, where either side may be undefined. */
function ratioMetric(
  numerator: number,
  denominator: number,
  prevNumerator: number | null,
  prevDenominator: number | null
): ReportMetric {
  const value = ratio(numerator, denominator) ?? 0;
  const previous =
    prevNumerator === null || prevDenominator === null
      ? null
      : ratio(prevNumerator, prevDenominator);
  return metric(value, previous);
}

/**
 * The fraction of the weaker channel's spend a reallocation proposes moving. Surfaced in
 * `BudgetReallocation.basis` so the amount is traceable to a rule rather than appearing from
 * nowhere.
 */
const REALLOCATION_SHARE = 0.15;

/**
 * Flags the worst-ROAS ad channel and recommends shifting a conservative slice of its spend to the
 * best — only when the gap is meaningful (best ROAS > 1.2x worst).
 */
export function recommendBudgetReallocation(
  channels: ChannelPerformance[]
): BudgetReallocation | null {
  // Only channels that actually buy media can give budget up or absorb it. Organic became eligible
  // the moment it got a row here, and because its ROAS computes as 0 it would sort as the worst
  // channel every time — the engine would propose moving 15% of a spend of zero out of the one
  // channel that costs nothing.
  const paid = channels.filter((c) => isPaid(c) && c.spend > 0);
  if (paid.length < 2) return null;

  const scored = paid
    .map((c) => ({ ...c, roas: c.revenue / c.spend }))
    .sort((a, b) => a.roas - b.roas);
  const worst = scored[0]!;
  const best = scored[scored.length - 1]!;
  if (worst.channel === best.channel || best.roas <= worst.roas * 1.2) return null;

  const fromLabel = channelLabel(worst.channel);
  const toLabel = channelLabel(best.channel);
  return {
    fromChannel: worst.channel,
    toChannel: best.channel,
    amount: round2(worst.spend * REALLOCATION_SHARE),
    basis: `${Math.round(REALLOCATION_SHARE * 100)}% of the ${fromLabel} budget for this period.`,
    reason: `${fromLabel} is returning ${worst.roas.toFixed(2)}x ROAS vs. ${toLabel} at ${best.roas.toFixed(2)}x. Shifting a portion of budget could improve overall blended efficiency.`,
  };
}

/**
 * The one-line verdict.
 *
 * States the direction of blended efficiency rather than repeating the numbers rendered directly
 * beside it — the previous first line of the summary printed revenue, spend and ROAS, all three of
 * which sit in headline tiles a few pixels above it on the page.
 */
function buildHeadline(mer: ReportMetric, adSpend: ReportMetric, hasChannels: boolean): string {
  if (!hasChannels) return "No channel data yet — connect a channel to start your weekly report.";
  const value = `${mer.value.toFixed(2)}x`;
  if (mer.deltaPct === null) {
    return `Blended MER is ${value} across $${money(adSpend.value)} of ad spend.`;
  }
  const spendClause =
    adSpend.deltaPct === null || adSpend.deltaPct === 0
      ? `on $${money(adSpend.value)} of ad spend`
      : `on ${pct(adSpend.deltaPct)} ${adSpend.deltaPct > 0 ? "more" : "less"} ad spend`;
  if (mer.deltaPct === 0) return `Blended MER held at ${value} ${spendClause}.`;
  const verb = mer.deltaPct > 0 ? "rose" : "slipped";
  return `Blended MER ${verb} ${pct(mer.deltaPct)} to ${value} ${spendClause}.`;
}

export function generateWeeklyReport(input: {
  weekStart: string;
  /** The window actually measured. Omit when the caller has no data window (pure fixtures). */
  period?: ReportPeriod | null;
  channels: ChannelPerformance[];
  /** The same channels over the preceding period of equal length, for week-over-week. */
  previousChannels?: ChannelPerformance[];
  topOpportunities: ReportOpportunity[];
  /** Total pending recommendations, of which `topOpportunities` is the capped head. */
  openOpportunities?: number;
}): WeeklyReport {
  const cur = input.channels;
  const prev = input.previousChannels ?? null;
  const paidCur = cur.filter(isPaid);

  const revenueNow = sumBy(cur, (c) => c.revenue);
  const spendNow = sumBy(cur, (c) => c.spend);
  const paidRevenueNow = sumBy(paidCur, (c) => c.revenue);

  const revenuePrev = prev ? sumBy(prev, (c) => c.revenue) : null;
  const spendPrev = prev ? sumBy(prev, (c) => c.spend) : null;
  const paidRevenuePrev = prev ? sumBy(prev.filter(isPaid), (c) => c.revenue) : null;

  const revenue = metric(revenueNow, revenuePrev);
  const adSpend = metric(spendNow, spendPrev);
  const blendedMer = ratioMetric(revenueNow, spendNow, revenuePrev, spendPrev);
  const paidRoas = ratioMetric(paidRevenueNow, spendNow, paidRevenuePrev, spendPrev);

  const prevByChannel = new Map((prev ?? []).map((c) => [c.channel, c]));
  const channelBreakdown: ReportChannel[] = cur
    .map((c) => {
      const roas = roasOf(c);
      const before = prevByChannel.get(c.channel) ?? null;
      const prevRoas = before ? roasOf(before) : null;
      return {
        ...c,
        roas,
        cpa: isPaid(c) && c.conversions && c.conversions > 0 ? ratio(c.spend, c.conversions) : null,
        revenueShare: revenueNow > 0 ? round2(c.revenue / revenueNow) : 0,
        previous: before ? { spend: before.spend, revenue: before.revenue, roas: prevRoas } : null,
        roasDelta: roas !== null && prevRoas !== null ? round2(roas - prevRoas) : null,
      };
    })
    // Paid channels first, each ordered by revenue, with any modelled organic row last: it is an
    // estimate, and an estimate should not lead a table of measured figures.
    .sort((a, b) => Number(isPaid(b)) - Number(isPaid(a)) || b.revenue - a.revenue);

  const headline = buildHeadline(blendedMer, adSpend, cur.length > 0);

  const lines: string[] = [];
  if (cur.length > 0) {
    if (revenue.deltaPct !== null && adSpend.deltaPct !== null) {
      const dir = (d: number) => (d > 0 ? "rose" : d < 0 ? "fell" : "held");
      lines.push(
        revenue.deltaPct === 0 && adSpend.deltaPct === 0
          ? "Revenue and ad spend both held flat against the prior period."
          : `Revenue ${dir(revenue.deltaPct)} ${pct(revenue.deltaPct)} while ad spend ${dir(adSpend.deltaPct)} ${pct(adSpend.deltaPct)}.`
      );
    }

    const ranked = paidCur
      .map((c) => ({ c, roas: roasOf(c) }))
      .filter((x): x is { c: ChannelPerformance; roas: number } => x.roas !== null)
      .sort((a, b) => b.roas - a.roas);
    if (ranked.length >= 2) {
      const best = ranked[0]!;
      const worst = ranked[ranked.length - 1]!;
      lines.push(
        `${channelLabel(best.c.channel)} led at ${best.roas.toFixed(2)}x ROAS; ${channelLabel(worst.c.channel)} returned ${worst.roas.toFixed(2)}x.`
      );
    } else if (ranked.length === 1) {
      lines.push(
        `${channelLabel(ranked[0]!.c.channel)} returned ${ranked[0]!.roas.toFixed(2)}x ROAS.`
      );
    }

    const organic = cur.find((c) => !isPaid(c));
    if (organic && revenueNow > 0) {
      const share = Math.round((organic.revenue / revenueNow) * 100);
      const clicks = organic.clicks ? ` from ${organic.clicks.toLocaleString("en-US")} clicks` : "";
      // "estimated" is not hedging: organic revenue here is modelled, and this sentence goes to a
      // customer inside a PDF.
      lines.push(
        `${channelLabel(organic.channel)} accounts for an estimated ${share}% of revenue${clicks}.`
      );
    }
  } else {
    lines.push("Connect a channel to start your weekly report.");
  }

  return {
    weekStart: input.weekStart,
    period: input.period ?? null,
    headline,
    summary: lines.join(" "),
    blendedMer,
    paidRoas,
    revenue,
    adSpend,
    channelBreakdown,
    topOpportunities: input.topOpportunities.slice(0, 3),
    openOpportunities: input.openOpportunities ?? input.topOpportunities.length,
    budgetReallocation: recommendBudgetReallocation(cur),
  };
}
