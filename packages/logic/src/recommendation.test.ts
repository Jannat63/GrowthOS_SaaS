import { describe, it, expect } from "vitest";
import { compositeScore, toRecommendation } from "./recommendation.js";

describe("compositeScore", () => {
  it("weights impact/urgency/effort", () => {
    expect(compositeScore(90, 60, 30)).toBe(
      Math.round(90 * 0.5 + 60 * 0.35 + (100 - 30) * 0.15)
    );
  });
});

describe("toRecommendation", () => {
  it("maps a bridge rec to channels + scores", () => {
    const r = toRecommendation(
      { id: "x", bridge: "SEO→GoogleAds", title: "T", message: "M", impact: "High" },
      "ws1"
    );
    expect(r.sourceChannel).toBe("seo");
    expect(r.targetChannel).toBe("google_ads");
    expect(r.impactScore).toBe(90);
    expect(r.status).toBe("pending");
    expect(r.compositeScore).toBeGreaterThan(0);
  });
});
