import { describe, it, expect } from "vitest";
import { coreTopic, generateContentBrief, paidToOrganicRecommendation } from "./content-brief.js";
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

  // Every string below is rendered verbatim on /content-pipeline for someone to copy into a CMS.
  // They were generated and persisted for months while the page displayed only
  // `headingStructure.length`, so nobody read them.
  it("never doubles a qualifier the keyword already carries", () => {
    const b = generateContentBrief("best office chair for back pain");
    const all = [b.recommendedH1, b.metaTitle, b.metaDescription, ...b.headingStructure, ...b.faqQuestions];
    for (const line of all) {
      expect(line.toLowerCase(), line).not.toContain("best best");
      expect(line.toLowerCase(), line).not.toContain("the right best");
    }
    expect(b.faqQuestions[0]).toBe("What is the best office chair for back pain?");
  });

  it("agrees the indefinite article with the topic", () => {
    expect(generateContentBrief("office chair").faqQuestions).toContain(
      "How much does an office chair cost?"
    );
    expect(generateContentBrief("gaming chair").faqQuestions).toContain(
      "How much does a gaming chair cost?"
    );
  });

  it("title-cases the way a headline is written, not word by word", () => {
    // "For" mid-title and "Rgb" both went into the H1 and the meta title.
    expect(generateContentBrief("best office chair for back pain").recommendedH1).toBe(
      "Best Office Chair for Back Pain: The Complete Guide"
    );
    expect(generateContentBrief("gaming chair rgb").recommendedH1).toBe(
      "Gaming Chair RGB: The Complete Guide"
    );
  });

  it("strips a leading qualifier only, keeping the rest of the phrase", () => {
    expect(coreTopic("best office chair for back pain")).toBe("office chair for back pain");
    expect(coreTopic("ergonomic chair for home office")).toBe("ergonomic chair for home office");
    // A single-word term is the whole topic — stripping it would leave nothing.
    expect(coreTopic("best")).toBe("best");
  });

  it("does not repeat a keyword token in the writer's term list", () => {
    const b = generateContentBrief("office chair office chair");
    expect(b.entities).toEqual([...new Set(b.entities)]);
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
