import type { MerDashboard, MerTrendPoint } from "@growthos/types";
import { calculateBlendedMER } from "@growthos/logic";

/**
 * Offline MER dashboard, mirroring what `apps/api/src/analytics.ts` computes from its seed.
 *
 * The previous mock used the API's base constants with every variance factor dropped:
 *
 *     const googleSpend = 45.5;                        // no spendFactor
 *     const metaSpend   = 90.25;                       // no spendFactor
 *     const revenue     = Math.round((320 + 210) * 2.2); // no revFactor
 *
 * Identical every day, so the "MER trend" chart was a perfectly horizontal line at 8.59x on every
 * render — a trend chart structurally incapable of showing a trend — and `anomaly` was the literal
 * `{ detected: false, changePercent: 0 }` rather than the computed week-over-week figure. Against
 * the same window the API returns 27.43x swinging between 21.59x and 39.31x, so connecting a
 * backend moved the headline number by 219% with no visible cause. `liveOrMock` promises the same
 * shape *and the same content*; a fallback this far from live breaks that.
 *
 * KEPT IN STEP BY HAND. These constants are copied from `apps/api/src/analytics.ts` (`seedRows`,
 * `REVENUE_FACTOR`) and `apps/api/src/seed-window.ts` (`SEED_DAYS`, `SEED_LAST_DAY`); apps/web
 * cannot import from apps/api. `mer.test.ts` pins the relationship this file is supposed to hold,
 * so a drift shows up as a failing test rather than as a quietly different offline product.
 */
const SEED_DAYS = 180;
const SEED_LAST_DAY = "2026-07-17";
const REVENUE_FACTOR = 2.2;

const BASE = {
  googleSpend: 45.5,
  metaSpend: 90.25,
  googleValue: 320,
  metaValue: 210,
} as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Every seeded date, oldest first — mirrors `seedDates()`. */
function seedDates(): string[] {
  const end = new Date(`${SEED_LAST_DAY}T00:00:00Z`);
  return Array.from({ length: SEED_DAYS }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (SEED_DAYS - 1 - i));
    return iso(d);
  });
}

/**
 * One seeded day.
 *
 * `day` is the index within the FULL seed window, not within the requested range — same as the API,
 * where a row's figures never depend on which subset happened to be queried.
 */
function seedDay(date: string, day: number) {
  const d = new Date(`${date}T00:00:00Z`);
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
  const spendFactor = (weekend ? 0.7 : 1) * (1 + Math.sin(day / 3) * 0.12);
  // Drift is a fraction of the whole window, not a per-day constant — see `drift()` in
  // apps/api/src/analytics.ts. The per-day form compounded six times over when SEED_DAYS went to
  // 180, taking blended MER to 27x.
  const revFactor =
    1 + Math.sin(day / 2.5 + 1) * 0.28 + (day / SEED_DAYS) * 0.36 + (weekend ? 0.08 : 0);
  return {
    date,
    googleSpend: round2(BASE.googleSpend * spendFactor),
    metaSpend: round2(BASE.metaSpend * spendFactor),
    convValue: round2(BASE.googleValue * revFactor) + round2(BASE.metaValue * revFactor),
  };
}

/**
 * The seeded window for a request, mirroring `resolveWindow`.
 *
 * With no explicit range the API returns the last N days of AVAILABLE data, not the last N days
 * before today — the fixtures end at `SEED_LAST_DAY` and every preset anchors there. The old mock
 * instead counted forward from a hardcoded `2026-06-18`, which only lined up for a 30-day request:
 * 7 days showed the wrong week, and 90 days invented two months of dates past the end of the seed.
 */
function windowFor(range: { from: string; to: string } | null, days: number): string[] {
  const all = seedDates();
  if (!range) return all.slice(-days);
  const from = new Date(`${range.from}T00:00:00Z`).getTime();
  const to = new Date(`${range.to}T00:00:00Z`).getTime();
  return all.filter((d) => {
    const t = new Date(`${d}T00:00:00Z`).getTime();
    return t >= from && t <= to;
  });
}

export function merMock(
  range: { from: string; to: string } | null,
  days: number
): MerDashboard {
  const index = new Map(seedDates().map((d, i) => [d, i]));
  const rows = windowFor(range, days).map((d) => seedDay(d, index.get(d)!));

  const trend: MerTrendPoint[] = rows.map((r) => {
    const revenue = Math.round(r.convValue * REVENUE_FACTOR);
    const spend = r.googleSpend + r.metaSpend;
    return {
      date: r.date,
      mer: calculateBlendedMER({
        totalRevenue: revenue,
        googleAdsSpend: r.googleSpend,
        metaAdsSpend: r.metaSpend,
      }).blendedMER,
      spend: round2(spend),
      revenue,
    };
  });

  const googleAdsSpend = rows.reduce((s, r) => s + r.googleSpend, 0);
  const metaAdsSpend = rows.reduce((s, r) => s + r.metaSpend, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.convValue * REVENUE_FACTOR, 0);

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
