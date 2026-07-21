import { describe, it, expect } from "vitest";
import { generateContentBrief, paidToOrganicRecommendation } from "./content-brief.js";
import { analyzeSearchTerm } from "./engines/search-terms-bridge.js";

describe("generateContentBrief", () => {
  it("produces a structured brief from a keyword", () => {
    const b = generateContentBrief("best office chair for back pain");
    expect(b.recommendedH1.toLowerCase()).toContain("office chair");
    expect(b.headingStructure.length).toBeGreaterThan(0);
    expect(b.wordCount).toBeGreaterThan(0);
    expect(b.metaTitle.length).toBeGreaterThan(0);
    expect(b.faqQuestions.length).toBeGreaterThan(0);
  });
});

describe("paidToOrganicRecommendation", () => {
  it("maps a paid-proven term to a paid_to_organic rec", () => {
    const t = analyzeSearchTerm({ term: "x", clicks: 100, conversions: 10, cost: 50, organicPosition: null });
    const r = paidToOrganicRecommendation(t, "ws1");
    expect(r.type).toBe("paid_to_organic");
    expect(r.sourceChannel).toBe("google_ads");
    expect(r.targetChannel).toBe("seo");
    expect(r.compositeScore).toBeGreaterThan(0);
  });
});
