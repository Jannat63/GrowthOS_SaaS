import type { MerDashboard, MerTrendPoint } from "@growthos/types";
import { calculateBlendedMER } from "@growthos/logic";
import { REVENUE_FACTOR, seedPlatformDays } from "@growthos/logic/fixtures";
import { seedWindow } from "./seed-window";

/**
 * Offline MER dashboard, built from the SAME generator the API seeds ClickHouse with.
 *
 * It used to re-implement that generator by hand — `apps/web` cannot import from `apps/api`, so the
 * weekend dip, the sinusoidal swing, the drift term and the window constants were all copied across
 * and kept in step by a test. That was the best available at the time and it was explicitly flagged
 * as known duplication. The generator now lives in `@growthos/logic/fixtures/seed`, which both sides
 * import, so live and offline agree by construction rather than by vigilance.
 *
 * Before either fix, the mock used the API's base constants with every variance factor dropped:
 *
 *     const googleSpend = 45.5;                          // no spendFactor
 *     const metaSpend   = 90.25;                         // no spendFactor
 *     const revenue     = Math.round((320 + 210) * 2.2); // no revFactor
 *
 * Identical every day, so the "MER trend" chart drew a perfectly horizontal line at 8.59x on every
 * render, and `anomaly` was the literal `{ detected: false, changePercent: 0 }`. Against the same
 * window the API returned 27.43x swinging between 21.59x and 39.31x.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function merMock(range: { from: string; to: string } | null, days: number): MerDashboard {
  const dates = new Set(seedWindow(range, days));
  const rows = new Map<string, { googleSpend: number; metaSpend: number; convValue: number }>();

  for (const d of seedPlatformDays()) {
    if (!dates.has(d.date)) continue;
    const row = rows.get(d.date) ?? { googleSpend: 0, metaSpend: 0, convValue: 0 };
    if (d.platform === "google_ads") row.googleSpend += d.spend;
    else row.metaSpend += d.spend;
    row.convValue += d.conversionValue;
    rows.set(d.date, row);
  }

  const trend: MerTrendPoint[] = [...rows.entries()].map(([date, r]) => {
    const revenue = Math.round(r.convValue * REVENUE_FACTOR);
    return {
      date,
      mer: calculateBlendedMER({
        totalRevenue: revenue,
        googleAdsSpend: r.googleSpend,
        metaAdsSpend: r.metaSpend,
      }).blendedMER,
      spend: round2(r.googleSpend + r.metaSpend),
      revenue,
    };
  });

  const all = [...rows.values()];
  const googleAdsSpend = all.reduce((s, r) => s + r.googleSpend, 0);
  const metaAdsSpend = all.reduce((s, r) => s + r.metaSpend, 0);
  const totalRevenue = all.reduce((s, r) => s + r.convValue * REVENUE_FACTOR, 0);

  return {
    trend,
    summary: calculateBlendedMER({ totalRevenue, googleAdsSpend, metaAdsSpend }),
    channelBreakdown: {
      googleAdsSpend: round2(googleAdsSpend),
      metaAdsSpend: round2(metaAdsSpend),
    },
    anomaly: anomalyOf(trend),
  };
}

/**
 * Week-over-week change in average MER — the same last-7-vs-prior-7 comparison the API runs.
 *
 * Exported because the dashboard shows the two averages this percentage is derived from: a change
 * figure on its own is a verdict the reader cannot check, and the same rule already governs the
 * creative scorecard's bands.
 */
export function anomalyOf(trend: MerTrendPoint[]): {
  detected: boolean;
  changePercent: number;
  recentAvg: number;
  priorAvg: number;
} {
  const values = trend.map((t) => t.mer);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const recentAvg = avg(values.slice(-7));
  const priorAvg = avg(values.slice(-14, -7));
  const changePercent = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;
  return {
    detected: Math.abs(changePercent) > 15,
    changePercent: Math.round(changePercent * 10) / 10,
    recentAvg: Math.round(recentAvg * 100) / 100,
    priorAvg: Math.round(priorAvg * 100) / 100,
  };
}
