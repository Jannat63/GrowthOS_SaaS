import { describe, it, expect } from "vitest";
import { recommendBudgetReallocation, generateWeeklyReport } from "./intelligence.js";

const ORGANIC = { channel: "organic", spend: 0, revenue: 600, clicks: 1200, paid: false, modelled: true };

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
    // The rule behind the amount travels with it — a dollar figure with no derivation is not
    // actionable.
    expect(r!.basis).toContain("15% of the Meta Ads budget");
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

  it("never proposes moving budget out of a channel that buys no media", () => {
    // Organic's ROAS is undefined, not 0. Scored as 0 it sorts worst every time, and the engine
    // proposes shifting 15% of a spend of zero out of the cheapest channel the business has.
    const r = recommendBudgetReallocation([
      ORGANIC,
      { channel: "google_ads", spend: 100, revenue: 400 },
      { channel: "meta_ads", spend: 100, revenue: 150 },
    ]);
    expect(r!.fromChannel).toBe("meta_ads");
  });

  it("returns null when only one channel actually buys media", () => {
    expect(
      recommendBudgetReallocation([ORGANIC, { channel: "google_ads", spend: 100, revenue: 400 }])
    ).toBeNull();
  });
});

describe("generateWeeklyReport", () => {
  const channels = [
    { channel: "google_ads", spend: 100, revenue: 400, conversions: 20 },
    { channel: "meta_ads", spend: 100, revenue: 150, conversions: 5 },
  ];

  it("separates blended MER from paid ROAS", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-07-13",
      channels: [...channels, ORGANIC],
      topOpportunities: [],
    });
    // Paid ROAS counts only ad-attributed revenue; blended counts organic too. Reporting one under
    // the other's name is what let this page and the Growth Hub disagree about the same week.
    expect(rep.paidRoas.value).toBe(2.75); // 550 / 200
    expect(rep.blendedMer.value).toBe(5.75); // 1150 / 200
    expect(rep.revenue.value).toBe(1150);
    expect(rep.adSpend.value).toBe(200);
  });

  it("carries per-channel ROAS, CPA, and revenue share", () => {
    const rep = generateWeeklyReport({ weekStart: "2026-07-13", channels, topOpportunities: [] });
    const google = rep.channelBreakdown.find((c) => c.channel === "google_ads")!;
    expect(google.roas).toBe(4);
    expect(google.cpa).toBe(5); // 100 spend / 20 conversions
    expect(google.revenueShare).toBeCloseTo(400 / 550, 2);
  });

  it("leaves ROAS and CPA null for a channel with no ad spend, and sorts it last", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-07-13",
      channels: [ORGANIC, ...channels],
      topOpportunities: [],
    });
    const organic = rep.channelBreakdown.find((c) => c.channel === "organic")!;
    expect(organic.roas).toBeNull();
    expect(organic.cpa).toBeNull();
    expect(rep.channelBreakdown.at(-1)!.channel).toBe("organic");
  });

  it("computes week-over-week deltas against the preceding period", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-07-13",
      channels,
      previousChannels: [
        { channel: "google_ads", spend: 100, revenue: 500 },
        { channel: "meta_ads", spend: 100, revenue: 100 },
      ],
      topOpportunities: [],
    });
    expect(rep.revenue.previous).toBe(600);
    expect(rep.revenue.deltaPct).toBe(-8); // 550 vs 600
    expect(rep.adSpend.deltaPct).toBe(0);
    const google = rep.channelBreakdown.find((c) => c.channel === "google_ads")!;
    expect(google.previous!.roas).toBe(5);
    expect(google.roasDelta).toBe(-1);
  });

  it("leaves deltas null when there is no prior period", () => {
    const rep = generateWeeklyReport({ weekStart: "2026-07-13", channels, topOpportunities: [] });
    expect(rep.revenue.previous).toBeNull();
    expect(rep.revenue.deltaPct).toBeNull();
    expect(rep.channelBreakdown[0]!.roasDelta).toBeNull();
  });

  it("writes a headline about the direction of efficiency, not the tile figures", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-07-13",
      channels,
      previousChannels: [
        { channel: "google_ads", spend: 50, revenue: 400 },
        { channel: "meta_ads", spend: 50, revenue: 200 },
      ],
      topOpportunities: [],
    });
    // 6.00x → 2.75x on double the spend.
    expect(rep.headline).toBe("Blended MER slipped 54% to 2.75x on 100% more ad spend.");
  });

  it("states the blended figure plainly when there is nothing to compare against", () => {
    const rep = generateWeeklyReport({ weekStart: "2026-07-13", channels, topOpportunities: [] });
    expect(rep.headline).toBe("Blended MER is 2.75x across $200 of ad spend.");
  });

  it("keeps channel slugs out of every customer-facing sentence", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-07-13",
      channels: [...channels, ORGANIC],
      previousChannels: channels,
      topOpportunities: [],
    });
    // The summary is customer-facing prose and goes into the PDF, so channels appear by name.
    expect(rep.summary).toContain("Google Ads led at 4.00x ROAS");
    expect(rep.summary).toContain("Meta Ads returned 1.50x");
    expect(rep.summary).toContain("Organic Search accounts for an estimated");
    expect(rep.summary).not.toContain("google_ads");
    expect(rep.summary).not.toContain("meta_ads");
    expect(rep.budgetReallocation?.reason).toContain("Meta Ads is returning");
    expect(rep.budgetReallocation?.reason).not.toContain("_ads");
  });

  it("does not restate the headline metrics in the summary", () => {
    const rep = generateWeeklyReport({ weekStart: "2026-07-13", channels, topOpportunities: [] });
    // Revenue, spend and blended efficiency all render as tiles beside this paragraph.
    expect(rep.summary).not.toContain("Total revenue");
    expect(rep.summary).not.toContain("blended ROAS");
  });

  it("caps opportunities at three but reports the true open count", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-07-13",
      channels,
      topOpportunities: [
        { title: "A", body: "a" },
        { title: "B", body: "b" },
        { title: "C", body: "c" },
        { title: "D", body: "d" },
      ],
      openOpportunities: 11,
    });
    expect(rep.topOpportunities).toHaveLength(3);
    expect(rep.openOpportunities).toBe(11);
  });

  it("records the measured window separately from the calendar week it is filed under", () => {
    const rep = generateWeeklyReport({
      weekStart: "2026-08-21",
      period: { from: "2026-07-11", to: "2026-07-17" },
      channels,
      topOpportunities: [],
    });
    expect(rep.weekStart).toBe("2026-08-21");
    expect(rep.period).toEqual({ from: "2026-07-11", to: "2026-07-17" });
  });

  it("handles empty channels without throwing", () => {
    const rep = generateWeeklyReport({ weekStart: "2026-07-13", channels: [], topOpportunities: [] });
    expect(rep.blendedMer.value).toBe(0);
    expect(rep.channelBreakdown).toHaveLength(0);
    expect(rep.budgetReallocation).toBeNull();
    expect(rep.headline).toContain("connect a channel");
  });
});
