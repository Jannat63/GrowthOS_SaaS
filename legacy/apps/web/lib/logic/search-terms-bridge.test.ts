import { describe, it, expect } from "vitest";
import { analyzeSearchTerm, analyzeSearchTerms, SearchTerm } from "./search-terms-bridge";

describe("analyzeSearchTerm", () => {
  it("flags a converting term with no organic coverage as paid-proven-organic-needed", () => {
    const term: SearchTerm = { term: "office chair", clicks: 100, conversions: 10, cost: 50, organicPosition: null };
    const result = analyzeSearchTerm(term);
    expect(result.recommendation.type).toBe("paid-proven-organic-needed");
  });

  it("flags a converting term ranking beyond position 10 as paid-proven-organic-needed", () => {
    const term: SearchTerm = { term: "office chair", clicks: 100, conversions: 10, cost: 50, organicPosition: 25 };
    const result = analyzeSearchTerm(term);
    expect(result.recommendation.type).toBe("paid-proven-organic-needed");
  });

  it("flags a converting term already ranking top 3 as reduce-bid-organic-covers", () => {
    const term: SearchTerm = { term: "office chair", clicks: 100, conversions: 10, cost: 50, organicPosition: 2 };
    const result = analyzeSearchTerm(term);
    expect(result.recommendation.type).toBe("reduce-bid-organic-covers");
  });

  it("does not flag a term with zero conversions, regardless of ranking", () => {
    const term: SearchTerm = { term: "office chair", clicks: 100, conversions: 0, cost: 50, organicPosition: null };
    const result = analyzeSearchTerm(term);
    expect(result.recommendation.type).toBe("monitor");
  });

  it("calculates conversion rate correctly", () => {
    const term: SearchTerm = { term: "office chair", clicks: 200, conversions: 20, cost: 50, organicPosition: null };
    const result = analyzeSearchTerm(term);
    expect(result.conversionRate).toBe(0.1);
  });

  it("handles zero clicks without dividing by zero", () => {
    const term: SearchTerm = { term: "office chair", clicks: 0, conversions: 0, cost: 0, organicPosition: null };
    const result = analyzeSearchTerm(term);
    expect(result.conversionRate).toBe(0);
    expect(Number.isFinite(result.conversionRate)).toBe(true);
  });

  it("treats position 10 as covered (boundary) and position 11 as not covered", () => {
    const covered = analyzeSearchTerm({ term: "a", clicks: 10, conversions: 1, cost: 1, organicPosition: 10 });
    const notCovered = analyzeSearchTerm({ term: "a", clicks: 10, conversions: 1, cost: 1, organicPosition: 11 });
    expect(covered.recommendation.type).not.toBe("paid-proven-organic-needed");
    expect(notCovered.recommendation.type).toBe("paid-proven-organic-needed");
  });
});

describe("analyzeSearchTerms", () => {
  it("sorts by conversions descending", () => {
    const results = analyzeSearchTerms([
      { term: "low", clicks: 10, conversions: 1, cost: 1, organicPosition: null },
      { term: "high", clicks: 10, conversions: 50, cost: 1, organicPosition: null },
    ]);
    expect(results[0].term).toBe("high");
  });
});
