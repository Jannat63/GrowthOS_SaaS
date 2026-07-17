import { describe, it, expect } from "vitest";
import { recommendBudgetReallocation, generateWeeklyReport } from "./intelligence.js";

describe("recommendBudgetReallocation", () => {
  it("shifts 15% from worst to best when the ROAS gap is large enough", () => {
    const r = recommendBudgetReallocation([
      { channel: "google_ads", spend: 100, revenue: 400 },
      { channel: "meta_ads", spend: 100, revenue: 150 },
    ]);
    expect(r).not.toBeNull();
    expect(r!.fromChannel).toBe("meta_ads");
    expect(r!.toChannel).toBe("google_ads");
    expect(r!.amount).toBe(15);
  });

  it("returns null when the ROAS gap is under 20%", () => {
    expect(
      recommendBudgetReallocation([
        { channel: "a", spend: 100, revenue: 200 },
        { channel: "b", spend: 100, revenue: 210 },
      ])
    ).toBeNull();
  });

  it("returns null with fewer than 2 channels", () => {
    expect(recommendBudgetReallocation([{ channel: "a", spend: 100, revenue: 200 }])).toBeNull();
  });
});

describe("generateWeeklyReport", () => {
  it("builds a report with blended ROAS, breakdown, capped opportunities, and budget suggestion", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-07-13",
      channels: [
        { channel: "google_ads", spend: 100, revenue: 400 },
        { channel: "meta_ads", spend: 100, revenue: 150 },
      ],
      topOpportunities: [
        { title: "A", body: "a" },
        { title: "B", body: "b" },
        { title: "C", body: "c" },
        { title: "D", body: "d" },
      ],
    });
    expect(rep.blendedRoas).toBe(2.75); // 550 / 200
    expect(rep.channelBreakdown).toHaveLength(2);
    expect(rep.topOpportunities).toHaveLength(3); // capped at 3
    expect(rep.budgetReallocation?.fromChannel).toBe("meta_ads");
    expect(rep.summary).toContain("blended ROAS");
  });

  it("handles empty channels without throwing", () => {
    const rep = generateWeeklyReport({ weekStart: "2026-07-13", channels: [], topOpportunities: [] });
    expect(rep.blendedRoas).toBe(0);
    expect(rep.channelBreakdown).toHaveLength(0);
    expect(rep.budgetReallocation).toBeNull();
  });
});
