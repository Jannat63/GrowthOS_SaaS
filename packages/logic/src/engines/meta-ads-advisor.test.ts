import { describe, expect, it } from "vitest";
import {
  calculateFunnelBudgetSplit,
  buildFullFunnelPlan,
  generateAdCopyVariants,
  generateUGCScript,
} from "./meta-ads-advisor.js";

describe("meta ads advisor", () => {
  it("splits budget across the funnel and (roughly) sums to the total", () => {
    const split = calculateFunnelBudgetSplit(1000, "new");
    expect(split).toEqual({ tofu: 500, mofu: 300, bofu: 200 });
    // Established accounts shift weight toward retargeting (BOFU).
    const est = calculateFunnelBudgetSplit(1000, "established");
    expect(est.bofu).toBeGreaterThan(split.bofu);
    expect(est.tofu).toBeLessThan(split.tofu);
  });

  it("builds a three-stage funnel plan with matching budgets", () => {
    const plan = buildFullFunnelPlan(2000, "Ergonomic Chair");
    expect(plan.map((s) => s.stage)).toEqual(["TOFU", "MOFU", "BOFU"]);
    expect(plan[0]!.budget).toBe(1000);
    expect(plan[0]!.audience).toContain("Ergonomic Chair");
  });

  it("fills ad-copy templates and respects the requested count", () => {
    const variants = generateAdCopyVariants("Standing Desk", "better posture", "back pain", 3);
    expect(variants).toHaveLength(3);
    // Placeholders are all replaced — no {curly} tokens remain.
    for (const v of variants) {
      expect(v.hook + v.body).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(v.cta.length).toBeGreaterThan(0);
    }
    // The pain-point hook is realized.
    expect(variants[0]!.hook).toBe("Tired of back pain?");
  });

  it("produces a UGC script for each supported duration", () => {
    for (const d of [15, 30, 60] as const) {
      const script = generateUGCScript("Water Bottle", d);
      expect(script.durationSeconds).toBe(d);
      expect(script.hook).toContain("Water Bottle");
      expect(script.cta.length).toBeGreaterThan(0);
    }
  });
});
