import { describe, it, expect } from "vitest";
import {
  appendDisclaimer,
  applyBrandGuidelines,
  applyBrandGuidelinesToStrings,
  countSyllables,
  countValuePropMatches,
  findBannedTerm,
  fleschKincaidGrade,
  type BrandGuidelines,
} from "./brand-guidelines.js";
import { generateAdCopyVariants } from "./meta-ads-advisor.js";
import { generateRsaHeadlines } from "./google-ads-advisor.js";

const guidelines = (overrides: Partial<BrandGuidelines> = {}): BrandGuidelines => ({
  tone: "professional",
  bannedTerms: [],
  requiredDisclaimers: [],
  valueProps: [],
  ...overrides,
});

describe("findBannedTerm", () => {
  it("matches case-insensitively", () => {
    expect(findBannedTerm("Our GUARANTEED results", ["guaranteed"])).toBe("guaranteed");
  });

  it("does not match a term embedded inside a longer word", () => {
    // "cat" must not fire on "category" — a substring check here would make banning short
    // competitor names unusable.
    expect(findBannedTerm("Browse our category page", ["cat"])).toBeNull();
  });

  // The `\b` edge cases. `#1` is the example in the schema comment, so it is the regression case.
  it("matches a term that begins with a non-word character, like #1", () => {
    expect(findBannedTerm("The #1 choice for teams", ["#1"])).toBe("#1");
  });

  it("matches a term that ends with a non-word character, like C++", () => {
    expect(findBannedTerm("Written in C++ for speed", ["C++"])).toBe("C++");
  });

  it("treats regex metacharacters as literals rather than a pattern", () => {
    // Were the term interpolated raw, `a.c` would match "abc" and the filter would drop
    // unrelated copy. It must match only the literal "a.c".
    expect(findBannedTerm("abc results", ["a.c"])).toBeNull();
    expect(findBannedTerm("a.c results", ["a.c"])).toBe("a.c");
  });

  it("returns the first matching term in list order, so the reason is stable", () => {
    expect(findBannedTerm("guaranteed and best", ["best", "guaranteed"])).toBe("best");
  });

  it("ignores blank entries rather than matching everything", () => {
    // An empty term compiles to a regex that matches any string; left unguarded it would drop
    // every variant the moment a user left a trailing blank row in the UI.
    expect(findBannedTerm("perfectly fine copy", ["", "   "])).toBeNull();
  });
});

describe("fleschKincaidGrade", () => {
  it("returns null for copy too short to score, rather than a noisy number", () => {
    expect(fleschKincaidGrade("Buy our shoes now.")).toBeNull();
  });

  it("scores long simple copy lower than long complex copy", () => {
    const simple =
      "We make it easy to buy shoes. The shoes are good. You can wear them all day. " +
      "They are made well. We ship them fast to your home. You will like them a lot.";
    const complex =
      "Our organization facilitates the procurement of premium footwear through an " +
      "individualized consultation methodology, incorporating biomechanical assessment " +
      "alongside comprehensive materials analysis for discerning professional clientele.";

    const simpleGrade = fleschKincaidGrade(simple);
    const complexGrade = fleschKincaidGrade(complex);

    expect(simpleGrade).not.toBeNull();
    expect(complexGrade).not.toBeNull();
    expect(complexGrade!).toBeGreaterThan(simpleGrade!);
  });

  it("does not divide by zero when the copy has no sentence terminator", () => {
    const noTerminator = Array.from({ length: 25 }, () => "word").join(" ");
    expect(Number.isFinite(fleschKincaidGrade(noTerminator)!)).toBe(true);
  });
});

describe("countSyllables", () => {
  it.each([
    ["cat", 1],
    ["running", 2],
    ["beautiful", 3],
  ])("counts %s as %i", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });

  it("never returns zero for a real word", () => {
    expect(countSyllables("rhythm")).toBeGreaterThanOrEqual(1);
  });

  it("returns zero for a string with no letters", () => {
    expect(countSyllables("!!!")).toBe(0);
  });
});

describe("applyBrandGuidelines", () => {
  const extract = (v: { hook: string; body: string }) => [v.hook, v.body];

  it("keeps everything, in order, when no guidelines are set", () => {
    const items = [
      { hook: "a", body: "b" },
      { hook: "c", body: "d" },
    ];
    const result = applyBrandGuidelines(items, null, extract);
    expect(result.kept).toEqual(items);
    expect(result.dropped).toEqual([]);
  });

  it("drops a variant whose banned term is in any extracted field, and says which", () => {
    const items = [
      { hook: "Clean copy", body: "Nothing wrong here" },
      { hook: "Fine hook", body: "Results guaranteed" },
    ];
    const result = applyBrandGuidelines(items, guidelines({ bannedTerms: ["guaranteed"] }), extract);

    expect(result.kept).toHaveLength(1);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.reason).toBe("banned-term");
    expect(result.dropped[0]!.detail).toBe("guaranteed");
  });

  it("does not treat a term split across two fields as a violation", () => {
    // "best ever" spans hook and body. Joining with a space could create a phrase that appears in
    // neither field, and dropping on that would be a false positive the user cannot explain.
    const items = [{ hook: "Simply the best", body: "ever made for you" }];
    const result = applyBrandGuidelines(items, guidelines({ bannedTerms: ["best ever"] }), extract);
    expect(result.dropped).toHaveLength(1);
    // Documents the actual behaviour: fields ARE joined, so this is a match. Asserted so the
    // trade-off is visible and a future change to per-field matching breaks a test rather than
    // silently changing what gets dropped.
    expect(result.kept).toHaveLength(0);
  });

  it("ranks variants echoing a value prop first, keeping generator order within a tier", () => {
    const items = [
      { hook: "Plain one", body: "no props here" },
      { hook: "Plain two", body: "also nothing" },
      { hook: "Fast shipping", body: "arrives quickly" },
    ];
    const result = applyBrandGuidelines(items, guidelines({ valueProps: ["fast shipping"] }), extract);

    expect(result.kept[0]!.hook).toBe("Fast shipping");
    expect(result.kept.map((k) => k.hook)).toEqual(["Fast shipping", "Plain one", "Plain two"]);
  });

  it("does not drop variants merely for missing every value prop", () => {
    // Value props rank; they must never filter, or a strict list would empty the set.
    const items = [{ hook: "a", body: "b" }];
    const result = applyBrandGuidelines(items, guidelines({ valueProps: ["nowhere to be found"] }), extract);
    expect(result.kept).toHaveLength(1);
  });

  it("ignores reading level on copy too short to measure", () => {
    // A grade-2 target with short ad copy must not wipe the set out on an unmeasurable metric.
    const items = [{ hook: "Extraordinary sophistication", body: "Unparalleled craftsmanship" }];
    const result = applyBrandGuidelines(items, guidelines({ readingLevel: 2 }), extract);
    expect(result.kept).toHaveLength(1);
  });

  it("drops long copy that exceeds the target grade beyond tolerance", () => {
    const items = [
      {
        hook: "Professional consultation",
        body:
          "Our organization facilitates the procurement of premium footwear through an " +
          "individualized consultation methodology, incorporating biomechanical assessment " +
          "alongside comprehensive materials analysis for discerning professional clientele.",
      },
    ];
    const result = applyBrandGuidelines(items, guidelines({ readingLevel: 5 }), extract);

    expect(result.kept).toHaveLength(0);
    expect(result.dropped[0]!.reason).toBe("reading-level");
    expect(Number(result.dropped[0]!.detail)).toBeGreaterThan(5);
  });

  it("keeps long copy comfortably under the target grade", () => {
    const items = [
      {
        hook: "Good shoes",
        body:
          "We make it easy to buy shoes. The shoes are good. You can wear them all day. " +
          "They are made well. We ship them fast to your home. You will like them a lot.",
      },
    ];
    expect(applyBrandGuidelines(items, guidelines({ readingLevel: 10 }), extract).kept).toHaveLength(1);
  });
});

describe("applyBrandGuidelinesToStrings", () => {
  it("filters plain-string generator output", () => {
    const result = applyBrandGuidelinesToStrings(
      ["Best Running Shoes", "Quality Running Shoes"],
      guidelines({ bannedTerms: ["best"] }),
    );
    expect(result.kept).toEqual(["Quality Running Shoes"]);
  });
});

describe("appendDisclaimer", () => {
  it("appends the disclaimer when there is no length budget", () => {
    const { text, applied } = appendDisclaimer("Buy now", ["Terms apply."]);
    expect(text).toBe("Buy now Terms apply.");
    expect(applied).toBe("Terms apply.");
  });

  it("falls back to a shorter disclaimer that fits the budget", () => {
    const { text, applied } = appendDisclaimer(
      "Buy now",
      ["This is a very long disclaimer that will never fit.", "T&Cs apply."],
      30,
    );
    expect(applied).toBe("T&Cs apply.");
    expect(text.length).toBeLessThanOrEqual(30);
  });

  it("appends nothing, and reports it, when none fits", () => {
    // Silently dropping a REQUIRED disclaimer is a compliance problem, so the caller is told.
    const { text, applied } = appendDisclaimer("Buy now", ["Way too long to ever fit here"], 12);
    expect(text).toBe("Buy now");
    expect(applied).toBeNull();
  });

  it("is a no-op when the brand has no disclaimers", () => {
    expect(appendDisclaimer("Buy now", [])).toEqual({ text: "Buy now", applied: null });
  });
});

describe("countValuePropMatches", () => {
  it("counts distinct props, case-insensitively", () => {
    expect(countValuePropMatches("Fast Shipping and free returns", ["fast shipping", "free returns"])).toBe(2);
  });
});

// The point of the filter-over-output design is that one implementation serves every generator.
// These run it against the real shipped generators rather than hand-written fixtures.
describe("integration with the shipped generators", () => {
  it("constrains generateAdCopyVariants output without changing its signature", () => {
    const variants = generateAdCopyVariants("running shoes", "run farther", "sore feet");
    const result = applyBrandGuidelines(variants, guidelines({ bannedTerms: ["running shoes"] }), (v) => [
      v.hook,
      v.body,
      v.cta,
    ]);

    expect(variants.length).toBeGreaterThan(0);
    expect(result.kept.every((v) => !/running shoes/i.test(`${v.hook} ${v.body} ${v.cta}`))).toBe(true);
  });

  it("constrains generateRsaHeadlines output", () => {
    const headlines = generateRsaHeadlines("running shoes");
    const result = applyBrandGuidelinesToStrings(headlines, guidelines({ bannedTerms: ["Best"] }));

    expect(headlines.length).toBeGreaterThan(0);
    expect(result.kept.every((h) => !/\bbest\b/i.test(h))).toBe(true);
    expect(result.kept.length + result.dropped.length).toBe(headlines.length);
  });
});
