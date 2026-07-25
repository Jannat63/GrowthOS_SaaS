import { describe, it, expect } from "vitest";
import { generateCreativeBrief, organicToPaidRecommendation } from "./creative-brief.js";
import { scoreKeyword } from "./engines/seo-scoring.js";

describe("generateCreativeBrief", () => {
  it("produces a Meta creative brief from a topic", () => {
    const b = generateCreativeBrief("office chair");
    expect(b.hook.length).toBeGreaterThan(0);
    expect(b.headline.toLowerCase()).toContain("office chair");
    expect(b.format.length).toBeGreaterThan(0);
    expect(b.callToAction.length).toBeGreaterThan(0);
  });
});

describe("organicToPaidRecommendation", () => {
  it("maps a top organic keyword to an organic_to_paid rec", () => {
    const k = scoreKeyword({
      keyword: "office chair", volume: 18000, difficulty: 62, currentPosition: 3,
      competitorGapCount: 3, paidProvenConversions: 42, geoCitationPotential: 40,
    });
    const r = organicToPaidRecommendation(k, "ws1");
    expect(r.type).toBe("organic_to_paid");
    expect(r.sourceChannel).toBe("seo");
    expect(r.targetChannel).toBe("meta_ads");
    expect(r.compositeScore).toBeGreaterThan(0);
  });
});
