import { describe, expect, it } from "vitest";
import { analyzeCampaigns, detectWastedSpend } from "../engines/google-ads-advisor.js";
import { adCampaigns } from "./google-ads.js";
import { metaCampaigns } from "./meta-ads.js";
import {
  SEED_DAYS,
  SEED_LAST_DAY,
  seedAdRows,
  seedDates,
  seedPlatformDays,
  type SeedAdRow,
  type SeedPlatform,
} from "./seed.js";

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function byPlatform(rows: SeedAdRow[], platform: SeedPlatform) {
  return rows.filter((r) => r.platform === platform);
}

/** What the campaign pages actually query: one row per campaign, summed over the whole window. */
function rollUp(rows: SeedAdRow[]) {
  const by = new Map<string, { id: string; name: string; clicks: number; conversions: number; cost: number; conversionValue: number }>();
  for (const r of rows) {
    const e = by.get(r.campaignId) ?? { id: r.campaignId, name: r.campaignName, clicks: 0, conversions: 0, cost: 0, conversionValue: 0 };
    e.clicks += r.clicks;
    e.conversions += r.conversions;
    e.cost += r.spend;
    e.conversionValue += r.conversionValue;
    by.set(r.campaignId, e);
  }
  return [...by.values()].map((c) => ({ ...c, cost: round2(c.cost), conversionValue: round2(c.conversionValue) }));
}

describe("seed window", () => {
  it("holds the 2x invariant against the longest dashboard range", () => {
    // 90 is the largest preset in apps/web/lib/stores/range.ts. Below 2x, the Growth Hub's
    // period-over-period comparison matches zero rows and every trend indicator disappears.
    expect(SEED_DAYS).toBeGreaterThanOrEqual(180);
  });

  it("ends at SEED_LAST_DAY and runs SEED_DAYS back from it", () => {
    const dates = seedDates();
    expect(dates).toHaveLength(SEED_DAYS);
    expect(dates.at(-1)).toBe(SEED_LAST_DAY);
    expect(new Set(dates).size).toBe(SEED_DAYS);
  });
});

describe("campaign split", () => {
  const rows = seedAdRows();

  /**
   * THE LOAD-BEARING TEST.
   *
   * Splitting one campaign per platform into a roster must not move a single aggregate: blended MER,
   * the Growth Hub tiles, the weekly report and the intelligence report all read `sum(...)` across
   * campaigns. If this fails, the seed calibration that put last-30-day MER at 12.42x has been
   * silently undone by a change to the split rather than by a change to the totals.
   */
  it("preserves every platform's daily totals exactly", () => {
    const expected = new Map(seedPlatformDays().map((d) => [`${d.platform}|${d.date}`, d]));
    const actual = new Map<string, { impressions: number; clicks: number; spend: number; conversions: number; conversionValue: number }>();

    for (const r of rows) {
      const key = `${r.platform}|${r.date}`;
      const e = actual.get(key) ?? { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionValue: 0 };
      e.impressions += r.impressions;
      e.clicks += r.clicks;
      e.spend += r.spend;
      e.conversions += r.conversions;
      e.conversionValue += r.conversionValue;
      actual.set(key, e);
    }

    expect(actual.size).toBe(expected.size);
    for (const [key, want] of expected) {
      const got = actual.get(key)!;
      expect(got.impressions, `${key} impressions`).toBe(want.impressions);
      expect(got.clicks, `${key} clicks`).toBe(want.clicks);
      expect(got.conversions, `${key} conversions`).toBe(want.conversions);
      expect(round2(got.spend), `${key} spend`).toBe(want.spend);
      expect(round2(got.conversionValue), `${key} value`).toBe(want.conversionValue);
    }
  });

  it("never emits a negative figure", () => {
    for (const r of rows) {
      expect(r.impressions).toBeGreaterThanOrEqual(0);
      expect(r.clicks).toBeGreaterThanOrEqual(0);
      expect(r.spend).toBeGreaterThanOrEqual(0);
      expect(r.conversions).toBeGreaterThanOrEqual(0);
      expect(r.conversionValue).toBeGreaterThanOrEqual(0);
    }
  });

  it("writes the fixture roster on both platforms", () => {
    expect(new Set(byPlatform(rows, "google_ads").map((r) => r.campaignId))).toEqual(
      new Set(adCampaigns.map((c) => c.id))
    );
    expect(new Set(byPlatform(rows, "meta_ads").map((r) => r.campaignId))).toEqual(
      new Set(metaCampaigns.map((c) => c.id))
    );
  });

  it("gives every campaign a share of the window, however small", () => {
    // The point of cumulative rather than per-day rounding: a campaign holding 1.3% of conversions
    // gets under a tenth of one a day and would round to zero forever under independent rounding,
    // handing it a "zero conversions" verdict its own share does not support.
    for (const c of rollUp(byPlatform(rows, "meta_ads"))) {
      expect(c.clicks, `${c.id} clicks`).toBeGreaterThan(0);
      expect(c.cost, `${c.id} cost`).toBeGreaterThan(0);
    }
    const broad = rollUp(byPlatform(rows, "meta_ads")).find((c) => c.id === "m-broad")!;
    expect(broad.conversions).toBeGreaterThan(0);
  });

  it("keeps each campaign's share of spend within a point of the roster's", () => {
    for (const platform of ["google_ads", "meta_ads"] as const) {
      const roster = platform === "google_ads" ? adCampaigns : metaCampaigns;
      const rosterTotal = sum(roster.map((c) => c.cost));
      const rolled = rollUp(byPlatform(rows, platform));
      const seedTotal = sum(rolled.map((c) => c.cost));
      for (const c of roster) {
        const got = rolled.find((r) => r.id === c.id)!;
        expect(Math.abs(got.cost / seedTotal - c.cost / rosterTotal), `${c.id} spend share`).toBeLessThan(0.01);
      }
    }
  });
});

describe("what the campaign pages read from it", () => {
  const meta = rollUp(byPlatform(seedAdRows(), "meta_ads"));

  it("still yields a losing campaign and a scalable one", () => {
    // The rosters were written to demonstrate the advisor's full range. If the split flattened that
    // — one status for every campaign — the page would render a table with nothing to decide.
    const statuses = new Set(analyzeCampaigns(meta).map((c) => c.status));
    expect(statuses.has("wasted")).toBe(true);
    expect(statuses.size).toBeGreaterThan(1);
  });

  it("still detects wasted spend, so the panel is not live-only-empty", () => {
    expect(detectWastedSpend(meta).length).toBeGreaterThan(0);
  });

  it("orders Advantage+ Broad as the loser it is written to be", () => {
    const insights = analyzeCampaigns(meta);
    expect(insights.find((c) => c.id === "m-broad")!.status).toBe("wasted");
    expect(insights.find((c) => c.id === "m-retarget")!.status).toBe("scale");
  });
});
