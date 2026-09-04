import { describe, it, expect } from "vitest";
import { merMock, anomalyOf } from "./mer";

const SEED_LAST_DAY = "2026-07-17";

describe("merMock", () => {
  /**
   * The regression this file exists for.
   *
   * The old mock used the API's base constants with every variance factor removed, so every day
   * carried identical spend and revenue and the "MER trend" chart rendered a perfectly horizontal
   * line at 8.59x — a trend chart that could not show a trend, on every render, forever.
   */
  it("produces a trend that actually moves", () => {
    const { trend } = merMock(null, 30);
    const distinct = new Set(trend.map((t) => t.mer));
    expect(trend).toHaveLength(30);
    expect(distinct.size).toBeGreaterThan(20);
  });

  it("dips spend at weekends, like the seed it mirrors", () => {
    const { trend } = merMock(null, 30);
    const isWeekend = (d: string) => [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay());
    const weekend = trend.filter((t) => isWeekend(t.date));
    const weekday = trend.filter((t) => !isWeekend(t.date));
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(weekend.map((t) => t.spend))).toBeLessThan(avg(weekday.map((t) => t.spend)));
  });

  /**
   * Presets anchor on the newest day with DATA, not on today — the fixtures end at SEED_LAST_DAY.
   * The old mock counted FORWARD from a hardcoded 2026-06-18, so it only lined up for a 30-day
   * request: 7 days showed the wrong week and 90 days ran two months past the end of the seed.
   */
  it("anchors every preset on the last seeded day", () => {
    for (const days of [7, 30, 90]) {
      const { trend } = merMock(null, days);
      expect(trend).toHaveLength(days);
      expect(trend[trend.length - 1]!.date, `${days}d must end at the seed's last day`).toBe(
        SEED_LAST_DAY
      );
    }
  });

  it("never invents a date past the end of the seed", () => {
    const { trend } = merMock(null, 90);
    for (const p of trend) expect(p.date <= SEED_LAST_DAY).toBe(true);
  });

  it("honours an explicit range", () => {
    const { trend } = merMock({ from: "2026-07-01", to: "2026-07-07" }, 30);
    expect(trend.map((t) => t.date)).toEqual([
      "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04",
      "2026-07-05", "2026-07-06", "2026-07-07",
    ]);
  });

  /**
   * A row's figures depend on its index in the FULL seed window, not on which subset was asked
   * for — same rule as the API. Without this a day's MER would change depending on the range it
   * was viewed through.
   */
  it("gives a date the same figures whatever range it is viewed through", () => {
    const wide = merMock(null, 90).trend.find((t) => t.date === "2026-07-10");
    const narrow = merMock({ from: "2026-07-08", to: "2026-07-12" }, 30).trend.find(
      (t) => t.date === "2026-07-10"
    );
    expect(narrow).toEqual(wide);
  });

  it("keeps the channel split summing to the reported spend", () => {
    const m = merMock(null, 30);
    const parts = m.channelBreakdown.googleAdsSpend + m.channelBreakdown.metaAdsSpend;
    expect(parts).toBeCloseTo(m.summary.totalSpend, 1);
  });

  it("carries the revenue and spend each MER point was derived from", () => {
    // Both fields were computed, typed and returned but never rendered — the chart plotted only
    // the ratio, which cannot say whether revenue rose or spend fell.
    for (const p of merMock(null, 30).trend) {
      expect(p.revenue).toBeGreaterThan(0);
      expect(p.spend).toBeGreaterThan(0);
      expect(p.mer).toBeCloseTo(p.revenue / p.spend, 1);
    }
  });
});

describe("anomalyOf", () => {
  it("computes week-over-week rather than reporting a hardcoded zero", () => {
    // The old mock returned `{ detected: false, changePercent: 0 }` as a literal, so the card read
    // "0% — within normal range" no matter what the data did.
    const a = merMock(null, 30).anomaly;
    expect(a.changePercent).not.toBe(0);
  });

  it("flags a move past 15% and reports the averages behind it", () => {
    const flat = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      mer: i < 7 ? 4 : 8,
      spend: 100,
      revenue: 400,
      googleSpend: 40,
      metaSpend: 60,
    }));
    const a = anomalyOf(flat);
    expect(a.priorAvg).toBe(4);
    expect(a.recentAvg).toBe(8);
    expect(a.changePercent).toBe(100);
    expect(a.detected).toBe(true);
  });

  it("does not divide by a zero prior window", () => {
    expect(anomalyOf([]).changePercent).toBe(0);
    expect(anomalyOf([]).detected).toBe(false);
  });
});
