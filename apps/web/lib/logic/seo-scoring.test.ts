import { describe, it, expect } from "vitest";
import { scoreKeyword, scoreKeywords, KeywordInput } from "./seo-scoring";

const base: KeywordInput = {
  keyword: "test keyword",
  volume: 10000,
  difficulty: 50,
  currentPosition: null,
  competitorGapCount: 5,
  paidProvenConversions: 0,
  geoCitationPotential: 30,
};

describe("scoreKeyword", () => {
  it("produces a score between 0 and 100", () => {
    const result = scoreKeyword(base);
    expect(result.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(result.opportunityScore).toBeLessThanOrEqual(100);
  });

  it("labels a keyword with paid conversions but no organic ranking as Paid-Proven, Organic Needed", () => {
    const result = scoreKeyword({ ...base, paidProvenConversions: 20, currentPosition: null });
    expect(result.label).toBe("Paid-Proven, Organic Needed");
  });

  it("labels a keyword with paid conversions but poor ranking (>10) as Paid-Proven, Organic Needed", () => {
    const result = scoreKeyword({ ...base, paidProvenConversions: 20, currentPosition: 15 });
    expect(result.label).toBe("Paid-Proven, Organic Needed");
  });

  it("does NOT flag Paid-Proven when the keyword already ranks top 10", () => {
    const result = scoreKeyword({ ...base, paidProvenConversions: 20, currentPosition: 4 });
    expect(result.label).not.toBe("Paid-Proven, Organic Needed");
  });

  it("gives a lower difficulty score a higher opportunity score, all else equal", () => {
    const easy = scoreKeyword({ ...base, difficulty: 10 });
    const hard = scoreKeyword({ ...base, difficulty: 90 });
    expect(easy.opportunityScore).toBeGreaterThan(hard.opportunityScore);
  });

  it("gives higher volume a higher opportunity score, all else equal", () => {
    const highVolume = scoreKeyword({ ...base, volume: 20000 });
    const lowVolume = scoreKeyword({ ...base, volume: 500 });
    expect(highVolume.opportunityScore).toBeGreaterThan(lowVolume.opportunityScore);
  });

  it("labels a very low-scoring keyword as Low Priority", () => {
    const result = scoreKeyword({
      keyword: "hard keyword", volume: 100, difficulty: 95,
      currentPosition: null, competitorGapCount: 0, paidProvenConversions: 0, geoCitationPotential: 0,
    });
    expect(result.label).toBe("Low Priority");
  });
});

describe("scoreKeywords", () => {
  it("sorts results by opportunity score descending", () => {
    const results = scoreKeywords([
      { ...base, keyword: "low", difficulty: 90, volume: 100 },
      { ...base, keyword: "high", difficulty: 10, volume: 20000 },
    ]);
    expect(results[0].keyword).toBe("high");
    expect(results[0].opportunityScore).toBeGreaterThanOrEqual(results[1].opportunityScore);
  });

  it("handles an empty array without throwing", () => {
    expect(scoreKeywords([])).toEqual([]);
  });
});
