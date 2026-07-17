import { describe, it, expect } from "vitest";
import { calculateBlendedMER } from "./blended-mer.js";

describe("calculateBlendedMER", () => {
  it("calculates revenue divided by total spend correctly", () => {
    const result = calculateBlendedMER({ totalRevenue: 40000, googleAdsSpend: 5000, metaAdsSpend: 5000 });
    expect(result.blendedMER).toBe(4);
    expect(result.totalSpend).toBe(10000);
  });

  it("handles zero spend without dividing by zero", () => {
    const result = calculateBlendedMER({ totalRevenue: 10000, googleAdsSpend: 0, metaAdsSpend: 0 });
    expect(result.blendedMER).toBe(0);
    expect(Number.isFinite(result.blendedMER)).toBe(true);
  });

  it("labels excellent efficiency at 4x or above", () => {
    const result = calculateBlendedMER({ totalRevenue: 40000, googleAdsSpend: 5000, metaAdsSpend: 5000 });
    expect(result.interpretation).toContain("Excellent");
  });

  it("labels healthy efficiency between 2x and 4x", () => {
    const result = calculateBlendedMER({ totalRevenue: 25000, googleAdsSpend: 5000, metaAdsSpend: 5000 });
    expect(result.interpretation).toContain("Healthy");
  });

  it("labels below-target efficiency under 2x", () => {
    const result = calculateBlendedMER({ totalRevenue: 8000, googleAdsSpend: 5000, metaAdsSpend: 5000 });
    expect(result.interpretation).toContain("Below target");
  });

  it("rounds to 2 decimal places", () => {
    const result = calculateBlendedMER({ totalRevenue: 10000, googleAdsSpend: 3000, metaAdsSpend: 0 });
    // 10000 / 3000 = 3.3333...
    expect(result.blendedMER).toBe(3.33);
  });
});
