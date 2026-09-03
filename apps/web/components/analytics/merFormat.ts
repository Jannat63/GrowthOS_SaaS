import type { MerTrendPoint } from "@growthos/types";

/**
 * One money formatter for the whole module.
 *
 * Total ad spend rendered through `toLocaleString()` and the channel split through `Math.round()`,
 * so a single card showed "$4,072.5" above "$1365" and "$2708" — three precisions, and a total that
 * did not match the sum printed beneath it. Both figures come from the same two numbers
 * (`summary.totalSpend` is `googleAdsSpend + metaAdsSpend`), so the disagreement was purely in the
 * formatting. Whole dollars everywhere: cents are noise at this magnitude, and the parts add up.
 */
export function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** A MER ratio, always to two places so a column of them stays aligned. */
export function ratio(n: number): string {
  return `${n.toFixed(2)}×`;
}

export function signedPercent(n: number): string {
  return `${n > 0 ? "+" : ""}${n}%`;
}

/**
 * The share of a total, guarded against the empty window.
 *
 * A workspace with no spend in the range divides by zero, which renders `NaN%` — and a bar of
 * `width: NaN%` silently collapses rather than erroring.
 */
export function share(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

/**
 * Which side of the ratio moved.
 *
 * MER is revenue over spend, so it rises either because revenue rose or because spend fell — two
 * opposite situations that the ratio alone reports identically. The trend already carries both
 * components per day; this compares the last seven days with the seven before, the same window the
 * anomaly figure uses, so the two readings cannot tell different stories.
 */
export function whatMoved(trend: MerTrendPoint[]): {
  revenueChange: number;
  spendChange: number;
  driver: "revenue" | "spend" | "both" | "steady";
} | null {
  if (trend.length < 14) return null;
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const recent = trend.slice(-7);
  const prior = trend.slice(-14, -7);

  const pctChange = (now: number, before: number) =>
    before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : 0;

  const revenueChange = pctChange(sum(recent.map((t) => t.revenue)), sum(prior.map((t) => t.revenue)));
  const spendChange = pctChange(sum(recent.map((t) => t.spend)), sum(prior.map((t) => t.spend)));

  // 2% is the band below which a weekly swing is noise rather than a move worth naming.
  const NOISE = 2;
  const revMoved = Math.abs(revenueChange) >= NOISE;
  const spendMoved = Math.abs(spendChange) >= NOISE;

  const driver = revMoved && spendMoved ? "both" : revMoved ? "revenue" : spendMoved ? "spend" : "steady";
  return { revenueChange, spendChange, driver };
}
