import { describe, it, expect } from "vitest";
import {
  META_LIMITS,
  generateCreativeBrief,
  isCreativeBrief,
  organicToPaidRecommendation,
} from "./creative-brief.js";
import { generateContentBrief } from "./content-brief.js";
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

describe("generateCreativeBrief", () => {
  // Every keyword the organic->paid generator can reach, plus longer ones the export allows.
  const keywords = [
    "office chair",
    "ergonomic chair",
    "sofa collection",
    "best office chair for back pain",
    "ergonomic chair for home office",
    "gaming chair rgb",
  ];

  it("keeps every ad field inside the limits Meta truncates at", () => {
    // The old templates produced a 45-character headline and 127 characters of primary text for a
    // realistic keyword. Meta cuts the headline mid-phrase and collapses the primary text behind
    // "See more", so the end of the copy was never read — and the page never rendered the headline
    // at all, so nothing surfaced it.
    for (const k of keywords) {
      const b = generateCreativeBrief(k);
      expect(b.headline.length, `headline for "${k}": ${b.headline}`).toBeLessThanOrEqual(
        META_LIMITS.headline
      );
      expect(b.primaryText.length, `primary text for "${k}"`).toBeLessThanOrEqual(
        META_LIMITS.primaryText
      );
    }
  });

  it("shortens by dropping the suffix, never by cutting the keyword", () => {
    // "ergonomic chair for home office" cannot carry the suffix inside 40 characters, so the
    // suffix goes. Truncating the term itself would change what the ad is about.
    const b = generateCreativeBrief("ergonomic chair for home office");
    expect(b.headline).toBe("Ergonomic Chair for Home Office");
    expect(generateCreativeBrief("office chair").headline).toBe("Office Chair — Made Simple");
  });

  it("does not double a qualifier the keyword already carries", () => {
    const b = generateCreativeBrief("best office chair for back pain");
    expect(b.hook).toBe("Still searching for the right office chair for back pain?");
    expect(b.headline.toLowerCase()).not.toContain("best best");
  });

  it("writes acronyms and function words the way a headline does", () => {
    expect(generateCreativeBrief("gaming chair rgb").headline).toContain("Gaming Chair RGB");
  });
});

describe("isCreativeBrief", () => {
  it("tells the two shapes stored in the same column apart", () => {
    expect(isCreativeBrief(generateCreativeBrief("office chair"))).toBe(true);
    expect(isCreativeBrief(generateContentBrief("office chair"))).toBe(false);
    expect(isCreativeBrief(null)).toBe(false);
    expect(isCreativeBrief({})).toBe(false);
  });
});
