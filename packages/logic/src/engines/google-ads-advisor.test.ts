import { describe, expect, it } from "vitest";
import {
  analyzeCampaigns,
  detectWastedSpend,
  summarizeCampaigns,
  generateRsaHeadlines,
  generateRsaDescriptions,
  calculateTargetCpa,
  calculateMinimumRoas,
  allocateBudget,
  type CampaignInput,
} from "./google-ads-advisor.js";

const campaigns: CampaignInput[] = [
  // Wasted: lots of clicks, zero conversions.
  { id: "1", name: "Broad - Everything", clicks: 300, conversions: 0, cost: 450, conversionValue: 0 },
  // Scale: strong ROAS.
  { id: "2", name: "Search - Brand", clicks: 200, conversions: 40, cost: 300, conversionValue: 1500 },
  // Healthy: moderate ROAS.
  { id: "3", name: "Search - Category", clicks: 150, conversions: 12, cost: 260, conversionValue: 520 },
  // Low quality score.
  { id: "4", name: "Display - Remarketing", clicks: 120, conversions: 5, cost: 180, conversionValue: 240, qualityScore: 2 },
];

describe("google ads advisor", () => {
  it("classifies campaigns and computes cpa/roas", () => {
    const insights = analyzeCampaigns(campaigns);
    const byId = Object.fromEntries(insights.map((i) => [i.id, i]));

    expect(byId["1"]!.status).toBe("wasted");
    expect(byId["1"]!.cpa).toBe(0); // no conversions
    expect(byId["2"]!.status).toBe("scale");
    expect(byId["2"]!.roas).toBe(5); // 1500 / 300
    expect(byId["2"]!.cpa).toBe(7.5); // 300 / 40
    expect(byId["3"]!.status).toBe("healthy");
  });

  it("flags a sub-1 ROAS campaign as wasted", () => {
    const [c] = analyzeCampaigns([
      { id: "x", name: "Loss maker", clicks: 40, conversions: 3, cost: 200, conversionValue: 120 },
    ]);
    expect(c!.roas).toBeLessThan(1);
    expect(c!.status).toBe("wasted");
  });

  it("flags a low-clicks, near-zero-return campaign as wasted (not healthy)", () => {
    // $500 spent to return $2, only 40 clicks: ROAS rounds to 0 — must NOT slip into "healthy".
    const [c] = analyzeCampaigns([
      { id: "y", name: "Money pit", clicks: 40, conversions: 1, cost: 500, conversionValue: 2 },
    ]);
    expect(c!.status).toBe("wasted");
  });

  it("detects wasted spend: zero-conversion (High) and low quality score (Medium)", () => {
    const findings = detectWastedSpend(campaigns);
    const zeroConv = findings.find((f) => f.campaign === "Broad - Everything");
    expect(zeroConv?.severity).toBe("High");
    expect(zeroConv?.wastedSpend).toBe(450);
    const lowQs = findings.find((f) => f.issue.includes("Quality Score"));
    expect(lowQs?.severity).toBe("Medium");
  });

  it("summarizes blended metrics + counts", () => {
    const summary = summarizeCampaigns(analyzeCampaigns(campaigns));
    expect(summary.totalSpend).toBe(1190);
    expect(summary.totalConversions).toBe(57);
    expect(summary.wastedCount).toBe(1);
    expect(summary.scaleCount).toBe(1);
    expect(summary.blendedRoas).toBeGreaterThan(0);
  });

  it("generates RSA headlines within the 30-char limit", () => {
    const headlines = generateRsaHeadlines("office chairs");
    expect(headlines.length).toBeGreaterThan(0);
    expect(headlines.every((h) => h.length <= 30)).toBe(true);
  });

  it("generates RSA descriptions within the 90-char limit", () => {
    const descriptions = generateRsaDescriptions("office chairs");
    expect(descriptions.length).toBeGreaterThan(0);
    expect(descriptions.every((d) => d.length <= 90)).toBe(true);
  });

  it("computes target CPA and minimum ROAS from unit economics", () => {
    expect(calculateTargetCpa(50)).toBe(40); // 50 * (1 - 0.2)
    expect(calculateTargetCpa(50, 0)).toBe(50); // breakeven when no target profit
    // Break-even ROAS = price / margin = 100 / (100 - 40) = 1.67 (not the markup ratio 2.5).
    expect(calculateMinimumRoas(100, 40)).toBe(1.67);
    expect(calculateMinimumRoas(100, 100)).toBe(0); // zero margin → guard
  });

  it("allocates budget across channels summing to the total", () => {
    const rows = allocateBudget(1000, "growth");
    expect(rows.map((r) => r.channel)).toEqual(["search", "pmax", "display", "demand_gen"]);
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(1000, 2);
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(1, 5);
    // Scale stage shifts weight to Performance Max.
    const scale = allocateBudget(1000, "scale");
    expect(scale.find((r) => r.channel === "pmax")!.amount).toBeGreaterThan(
      rows.find((r) => r.channel === "pmax")!.amount
    );
  });
});
