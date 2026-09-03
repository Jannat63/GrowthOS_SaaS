import { describe, it, expect } from "vitest";
import {
  META_LIMITS,
  creativePlay,
  generateCreativeBrief,
  isCreativeBrief,
  organicToPaidRecommendation,
  type CreativeBriefInput,
} from "./creative-brief.js";
import { generateContentBrief } from "./content-brief.js";
import { scoreKeyword } from "./engines/seo-scoring.js";

/** A keyword in the shape the generator reads. Defaults land in `claim` with paid proof. */
function kw(over: Partial<CreativeBriefInput> & { keyword: string }): CreativeBriefInput {
  return {
    volume: 9500,
    currentPosition: 6,
    paidProvenConversions: 31,
    ...over,
  };
}

describe("creativePlay", () => {
  // The break is the top of a page of organic results, not an invented constant.
  it("calls 1-3 `own` and 4-10 `claim`", () => {
    expect(creativePlay(kw({ keyword: "a", currentPosition: 1 }))).toBe("own");
    expect(creativePlay(kw({ keyword: "a", currentPosition: 3 }))).toBe("own");
    expect(creativePlay(kw({ keyword: "a", currentPosition: 4 }))).toBe("claim");
    expect(creativePlay(kw({ keyword: "a", currentPosition: 10 }))).toBe("claim");
  });

  it("cannot call an unranked keyword owned", () => {
    expect(creativePlay(kw({ keyword: "a", currentPosition: null }))).toBe("claim");
  });

  /**
   * The regression this whole change exists for.
   *
   * `generateCreativeBrief` used to take only the keyword string, so every opportunity produced a
   * byte-identical ad — three cards on the Creative Queue differing by one noun. Two keywords in
   * different organic positions must now produce different copy, format and audience.
   */
  it("gives two different positions genuinely different ads", () => {
    const owned = generateCreativeBrief(kw({ keyword: "sofa collection", currentPosition: 3 }));
    const contested = generateCreativeBrief(kw({ keyword: "sofa collection", currentPosition: 6 }));

    expect(owned.play).toBe("own");
    expect(contested.play).toBe("claim");
    expect(owned.primaryText).not.toBe(contested.primaryText);
    expect(owned.headline).not.toBe(contested.headline);
    expect(owned.format).not.toBe(contested.format);
    expect(owned.audience).not.toBe(contested.audience);
    expect(owned.hook).not.toBe(contested.hook);
  });
});

describe("proof of sale", () => {
  it("asks for the sale only where paid has shown the term converts", () => {
    expect(generateCreativeBrief(kw({ keyword: "office chair", paidProvenConversions: 42 })).callToAction).toBe("Shop now");
    expect(generateCreativeBrief(kw({ keyword: "office chair", paidProvenConversions: 0 })).callToAction).toBe("Learn more");
  });

  it("says which way the evidence ran, in both directions", () => {
    expect(generateCreativeBrief(kw({ keyword: "office chair", paidProvenConversions: 1 })).rationale).toContain("1 conversion from");
    expect(generateCreativeBrief(kw({ keyword: "office chair", paidProvenConversions: 0 })).rationale).toContain("No paid conversion history");
  });
});

describe("generateCreativeBrief", () => {
  const keywords = [
    "office chair",
    "ergonomic chair",
    "sofa collection",
    "best office chair for back pain",
    "ergonomic chair for home office",
    "gaming chair rgb",
  ];

  it("keeps every ad field inside the limits Meta truncates at, in both plays", () => {
    // Past these counts the headline is cut mid-phrase and the primary text collapses behind "See
    // more", so the end of the copy is never read.
    for (const keyword of keywords) {
      for (const currentPosition of [2, 7]) {
        const b = generateCreativeBrief(kw({ keyword, currentPosition }));
        expect(b.headline.length, `headline for "${keyword}" @#${currentPosition}: ${b.headline}`)
          .toBeLessThanOrEqual(META_LIMITS.headline);
        expect(b.primaryText.length, `primary text for "${keyword}" @#${currentPosition}`)
          .toBeLessThanOrEqual(META_LIMITS.primaryText);
      }
    }
  });

  /**
   * The old template opened every ad with "Thousands find their {topic} through us" — a factual
   * claim about the customer's business that nothing in this product measures, generated straight
   * into copy meant for a live Meta ad. Nothing may assert traffic, popularity or a customer count.
   */
  it("never invents social proof", () => {
    for (const keyword of keywords) {
      for (const currentPosition of [2, 7]) {
        const b = generateCreativeBrief(kw({ keyword, currentPosition }));
        expect(b.primaryText.toLowerCase()).not.toMatch(
          /thousands|millions|everyone|most people|#1|best[- ]selling/
        );
      }
    }
  });

  it("shortens by dropping the suffix, never by cutting the keyword", () => {
    // This one cannot carry a suffix inside 40 characters, so the suffix goes. Truncating the term
    // itself would change what the ad is about.
    const b = generateCreativeBrief(kw({ keyword: "ergonomic chair for home office" }));
    expect(b.headline).toBe("Ergonomic Chair for Home Office");
    expect(generateCreativeBrief(kw({ keyword: "office chair" })).headline)
      .toBe("Office Chair — What to Compare");
    expect(generateCreativeBrief(kw({ keyword: "office chair", currentPosition: 2 })).headline)
      .toBe("Office Chair — Start Here");
  });

  it("does not double a qualifier the keyword already carries", () => {
    const b = generateCreativeBrief(kw({ keyword: "best office chair for back pain" }));
    expect(b.primaryText).toContain("office chair for back pain");
    expect(b.primaryText.toLowerCase()).not.toContain("best best");
    expect(b.headline.toLowerCase()).not.toContain("best best");
  });

  it("writes acronyms and function words the way a headline does", () => {
    expect(generateCreativeBrief(kw({ keyword: "gaming chair rgb" })).headline).toContain("Gaming Chair RGB");
  });

  it("picks the article from the topic, not the qualifier", () => {
    expect(generateCreativeBrief(kw({ keyword: "office chair" })).primaryText).toContain("an office chair");
    expect(generateCreativeBrief(kw({ keyword: "sofa collection" })).primaryText).toContain("a sofa collection");
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

describe("isCreativeBrief", () => {
  it("tells the two shapes stored in the same column apart", () => {
    expect(isCreativeBrief(generateCreativeBrief(kw({ keyword: "office chair" })))).toBe(true);
    expect(isCreativeBrief(generateContentBrief("office chair"))).toBe(false);
    expect(isCreativeBrief(null)).toBe(false);
    expect(isCreativeBrief({})).toBe(false);
  });

  /**
   * `content_briefs.brief` is jsonb and holds rows written before plays existed. Those rows have
   * no `play` and must still render rather than failing the guard, so the guard must not test it.
   */
  it("still accepts a brief stored before plays existed", () => {
    const legacy = {
      hook: "Still searching for the right office chair?",
      primaryText: "Thousands find their office chair through us.",
      headline: "Office Chair — Made Simple",
      format: "Single image / short-form video",
      audience: 'Cold — interest-based lookalikes around "office chair"',
      callToAction: "Learn more",
    };
    expect(isCreativeBrief(legacy)).toBe(true);
  });
});
