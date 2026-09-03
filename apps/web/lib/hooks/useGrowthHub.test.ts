import { describe, expect, it } from "vitest";
import type { GrowthHubResponse } from "@growthos/types";
import { toGrowthHubData } from "./useGrowthHub";

// The API returns raw numbers; every formatting and delta decision lives in toGrowthHubData. These
// cover the cases that are easy to get wrong at a glance: the zero-previous divide, negative deltas,
// and the compact-number thresholds.

const base: GrowthHubResponse = {
  windowDays: 30,
  metrics: {
    revenue: { current: 48290, previous: 40720 },
    googleSpend: { current: 6200, previous: 5840 },
    metaSpend: { current: 4980, previous: 4690 },
    organicClicks: { current: 128400, previous: 111000 },
    conversions: { current: 6142, previous: 4933 },
  },
  daily: {
    revenue: [1200, 1400, 1600],
    adSpend: [300, 320, 310],
    conversions: [180, 200, 210],
    organicClicks: [4000, 4200, 4400],
  },
  window: { from: "2026-06-18", to: "2026-07-17" },
  dataFrom: "2026-01-19",
  dataThrough: "2026-07-17",
  channels: {
    seo: { organicClicks: 128400 },
    google: { conversions: 1842 },
    meta: { conversions: 2116 },
  },
  baseline: { currentConversionRate: 0.0246, currentAOV: 78.6, currentSessions: 249600 },
};

const withMetrics = (patch: Partial<GrowthHubResponse["metrics"]>): GrowthHubResponse => ({
  ...base,
  metrics: { ...base.metrics, ...patch },
});

describe("toGrowthHubData", () => {
  it("formats each KPI and computes its delta against the previous window", () => {
    const { kpis } = toGrowthHubData(base);
    const byKey = Object.fromEntries(kpis.map((k) => [k.key, k]));

    expect(byKey.revenue!.value).toBe("$48,290");
    expect(byKey.revenue!.deltaPct).toBe(18.6);
    // Ad spend is the sum of both platforms, not a field the API sends.
    expect(byKey.adSpend!.value).toBe("$11,180");
    expect(byKey.conversions!.value).toBe("6,142");
    expect(byKey.organicClicks!.value).toBe("128K");
  });

  it("passes each metric's daily series through to its tile", () => {
    const { kpis } = toGrowthHubData(base);
    const byKey = Object.fromEntries(kpis.map((k) => [k.key, k]));

    // Each KPI gets its OWN series — an easy one to cross-wire, and a cross-wired sparkline is
    // invisible in review because it still draws a plausible-looking line.
    expect(byKey.revenue!.series).toEqual([1200, 1400, 1600]);
    expect(byKey.adSpend!.series).toEqual([300, 320, 310]);
    expect(byKey.conversions!.series).toEqual([180, 200, 210]);
    expect(byKey.organicClicks!.series).toEqual([4000, 4200, 4400]);
  });

  it("reports a null delta rather than Infinity when the previous window was zero", () => {
    const { kpis } = toGrowthHubData(withMetrics({ revenue: { current: 500, previous: 0 } }));
    expect(kpis.find((k) => k.key === "revenue")!.deltaPct).toBeNull();
  });

  it("keeps the sign on a decline", () => {
    const { kpis } = toGrowthHubData(withMetrics({ conversions: { current: 80, previous: 100 } }));
    expect(kpis.find((k) => k.key === "conversions")!.deltaPct).toBe(-20);
  });

  it("switches to compact notation only above 10K", () => {
    expect(
      toGrowthHubData(withMetrics({ organicClicks: { current: 9800, previous: 1 } })).kpis.find(
        (k) => k.key === "organicClicks"
      )!.value
    ).toBe("9,800");
    expect(
      toGrowthHubData(withMetrics({ organicClicks: { current: 2_400_000, previous: 1 } })).kpis.find(
        (k) => k.key === "organicClicks"
      )!.value
    ).toBe("2.4M");
  });

  it("derives blended MER from the same numbers the KPIs show", () => {
    const { mer } = toGrowthHubData(base);
    // 48290 / (6200 + 4980)
    expect(mer.blendedMER).toBeCloseTo(4.32, 2);
  });

  it("passes the simulator baseline straight through", () => {
    expect(toGrowthHubData(base).baseline).toEqual(base.baseline);
  });
});
