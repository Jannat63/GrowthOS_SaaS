// Intelligence Engine V1 (M3 P3.4) — deterministic budget reallocation + weekly report. Ported from
// legacy intelligence-service/app/budget_and_reports.py. Template-first (D4); no LLM dependency.

export interface ChannelPerformance {
  channel: string;
  spend: number;
  revenue: number;
}

export interface BudgetReallocation {
  fromChannel: string;
  toChannel: string;
  amount: number;
  reason: string;
}

export interface ReportChannel extends ChannelPerformance {
  roas: number;
}

export interface ReportOpportunity {
  title: string;
  body: string;
}

export interface WeeklyReport {
  weekStart: string;
  summary: string;
  blendedRoas: number;
  totalRevenue: number;
  totalSpend: number;
  topOpportunities: ReportOpportunity[];
  channelBreakdown: ReportChannel[];
  budgetReallocation: BudgetReallocation | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const roasOf = (c: ChannelPerformance) => (c.spend > 0 ? c.revenue / c.spend : 0);
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Flags the worst-ROAS channel and recommends shifting a conservative 15% to the best — only when the
// gap is meaningful (best ROAS > 1.2× worst).
export function recommendBudgetReallocation(
  channels: ChannelPerformance[]
): BudgetReallocation | null {
  if (channels.length < 2) return null;
  const scored = channels
    .map((c) => ({ ...c, roas: roasOf(c) }))
    .sort((a, b) => a.roas - b.roas);
  const worst = scored[0]!;
  const best = scored[scored.length - 1]!;
  if (worst.channel === best.channel || best.roas <= worst.roas * 1.2) return null;
  return {
    fromChannel: worst.channel,
    toChannel: best.channel,
    amount: round2(worst.spend * 0.15),
    reason: `${worst.channel} is returning ${worst.roas.toFixed(2)}x ROAS vs. ${best.channel}'s ${best.roas.toFixed(2)}x. Shifting a portion of budget could improve overall blended efficiency.`,
  };
}

export function generateWeeklyReport(input: {
  weekStart: string;
  channels: ChannelPerformance[];
  topOpportunities: ReportOpportunity[];
}): WeeklyReport {
  const totalRevenue = input.channels.reduce((s, c) => s + c.revenue, 0);
  const totalSpend = input.channels.reduce((s, c) => s + c.spend, 0);
  const blendedRoas = totalSpend > 0 ? round2(totalRevenue / totalSpend) : 0;
  const channelBreakdown: ReportChannel[] = input.channels.map((c) => ({ ...c, roas: round2(roasOf(c)) }));

  const lines: string[] = [];
  if (input.channels.length > 0) {
    lines.push(
      `Total revenue this week: $${money(totalRevenue)} across $${money(totalSpend)} in spend (${blendedRoas}x blended ROAS).`
    );
    const best = input.channels.reduce((a, b) => (roasOf(b) > roasOf(a) ? b : a));
    const worst = input.channels.reduce((a, b) => (roasOf(b) < roasOf(a) ? b : a));
    lines.push(`${best.channel} was the top performer this week.`);
    if (worst.channel !== best.channel) {
      lines.push(`${worst.channel} underperformed relative to other channels.`);
    }
  } else {
    lines.push("No channel data yet — connect a channel to start your weekly report.");
  }

  return {
    weekStart: input.weekStart,
    summary: lines.join(" "),
    blendedRoas,
    totalRevenue,
    totalSpend,
    topOpportunities: input.topOpportunities.slice(0, 3),
    channelBreakdown,
    budgetReallocation: recommendBudgetReallocation(input.channels),
  };
}
