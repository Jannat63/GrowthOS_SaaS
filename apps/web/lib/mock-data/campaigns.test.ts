import { describe, it, expect } from "vitest";
import { metaCampaigns, adCampaigns } from "@growthos/logic/fixtures";
import { campaignsMock } from "./campaigns";

const SEED_LAST_DAY = "2026-07-17";

/**
 * The regression this file exists for.
 *
 * Live seeded exactly ONE campaign per platform while both ads pages fell back to the full fixture
 * roster. Over the same account, offline showed four Meta campaigns totalling $5,691 at 2.44x with a
 * red wasted-spend panel; live showed a one-row table totalling $14,950 at 3.05x, no wasted spend,
 * and no panel at all. Connecting a backend changed the page's subject, not just its numbers.
 */
describe("campaignsMock", () => {
  it("returns the whole roster, not a single campaign", () => {
    expect(campaignsMock("meta_ads", null, 30).campaigns.map((c) => c.id).sort()).toEqual(
      metaCampaigns.map((c) => c.id).sort()
    );
    expect(campaignsMock("google_ads", null, 30).campaigns.map((c) => c.id).sort()).toEqual(
      adCampaigns.map((c) => c.id).sort()
    );
  });

  it("anchors every preset on the last seeded day", () => {
    for (const days of [7, 30, 90]) {
      const { period } = campaignsMock("meta_ads", null, days);
      expect(period?.to, `${days}d must end at the seed's last day`).toBe(SEED_LAST_DAY);
    }
  });

  it("honours an explicit range and reports it back", () => {
    const { period } = campaignsMock("meta_ads", { from: "2026-07-01", to: "2026-07-07" }, 30);
    expect(period).toEqual({ from: "2026-07-01", to: "2026-07-07" });
  });

  /**
   * The window has to change the figures. Both endpoints ran with no date filter at all, so every
   * preset returned the same all-time totals — a picker that appeared to do nothing.
   */
  it("reports less spend over a shorter window", () => {
    const week = campaignsMock("meta_ads", null, 7).summary.totalSpend;
    const month = campaignsMock("meta_ads", null, 30).summary.totalSpend;
    expect(week).toBeGreaterThan(0);
    expect(week).toBeLessThan(month);
  });

  it("orders by spend, highest first — as the query does", () => {
    const costs = campaignsMock("google_ads", null, 30).campaigns.map((c) => c.cost);
    expect([...costs].sort((a, b) => b - a)).toEqual(costs);
  });

  it("keeps the campaign spends summing to the reported total", () => {
    const m = campaignsMock("meta_ads", null, 30);
    const parts = m.campaigns.reduce((s, c) => s + c.cost, 0);
    expect(parts).toBeCloseTo(m.summary.totalSpend, 1);
  });

  /**
   * The roster is written to demonstrate the advisor's full range — a scaling campaign, a healthy
   * one and one burning money. If the seed split flattened that, the table would have nothing to
   * decide and the wasted-spend panel would only ever appear offline.
   */
  it("still finds something to scale and something to cut", () => {
    const m = campaignsMock("meta_ads", null, 30);
    expect(m.summary.scaleCount).toBeGreaterThan(0);
    expect(m.summary.wastedCount).toBeGreaterThan(0);
    expect(m.wastedSpend.length).toBeGreaterThan(0);
  });

  /**
   * `conversionRate` was rounded to two decimal places as a RATIO, so anything under half a percent
   * read as exactly 0.00% — while the wasted-spend panel above the table quoted the same campaign's
   * rate as "0.14%" from its own unrounded calculation.
   */
  it("keeps sub-percent conversion rates instead of rounding them to zero", () => {
    const broad = campaignsMock("meta_ads", null, 30).campaigns.find((c) => c.id === "m-broad")!;
    expect(broad.conversionRate).toBeGreaterThan(0);
    expect(broad.conversionRate).toBeLessThan(0.005);
  });
});
