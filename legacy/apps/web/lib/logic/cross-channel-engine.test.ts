import { describe, it, expect } from "vitest";
import { generateCrossChannelRecommendations } from "./cross-channel-engine";
import { ScoredKeyword } from "./seo-scoring";
import { AnalyzedSearchTerm } from "./search-terms-bridge";
import { FatigueResult } from "./creative-fatigue";

function kw(overrides: Partial<ScoredKeyword>): ScoredKeyword {
  return {
    keyword: "test", volume: 5000, difficulty: 50, currentPosition: null,
    competitorGapCount: 0, paidProvenConversions: 0, geoCitationPotential: 0,
    opportunityScore: 50, label: "Standard", ...overrides,
  };
}

function term(overrides: Partial<AnalyzedSearchTerm>): AnalyzedSearchTerm {
  return {
    term: "test term", clicks: 10, conversions: 1, cost: 5, organicPosition: null,
    conversionRate: 0.1, recommendation: { type: "monitor", message: "" }, ...overrides,
  };
}

function creative(overrides: Partial<FatigueResult>): FatigueResult {
  return {
    name: "test ad", frequency: 1, ctrThisWeek: 1, ctrLastWeek: 1, hoursSinceLaunch: 10,
    ctrDeclinePercent: 0, status: "healthy", message: "", ...overrides,
  };
}

describe("generateCrossChannelRecommendations — SEO to Google Ads bridge", () => {
  it("recommends launching Google Ads for a keyword ranking 4-10", () => {
    const recs = generateCrossChannelRecommendations([kw({ keyword: "chair", currentPosition: 6 })], [], []);
    const bridge = recs.find((r) => r.bridge === "SEO→GoogleAds" && r.title.includes("Launch"));
    expect(bridge).toBeDefined();
  });

  it("does NOT recommend launching Google Ads for a keyword ranking #1-3", () => {
    const recs = generateCrossChannelRecommendations([kw({ keyword: "chair", currentPosition: 2, volume: 100 })], [], []);
    const launchRec = recs.find((r) => r.bridge === "SEO→GoogleAds" && r.title.includes("Launch"));
    expect(launchRec).toBeUndefined();
  });

  it("does NOT recommend launching for a keyword ranking beyond position 10", () => {
    const recs = generateCrossChannelRecommendations([kw({ keyword: "chair", currentPosition: 20 })], [], []);
    const launchRec = recs.find((r) => r.bridge === "SEO→GoogleAds" && r.title.includes("Launch"));
    expect(launchRec).toBeUndefined();
  });

  it("recommends reducing paid spend for a keyword ranking #1-3", () => {
    const recs = generateCrossChannelRecommendations([kw({ keyword: "chair", currentPosition: 1 })], [], []);
    const reduceRec = recs.find((r) => r.title.includes("Reduce paid spend"));
    expect(reduceRec).toBeDefined();
  });
});

describe("generateCrossChannelRecommendations — Google Ads to SEO bridge", () => {
  it("surfaces paid-proven-organic-needed search terms as SEO content recommendations", () => {
    const recs = generateCrossChannelRecommendations(
      [], [term({ term: "back pain chair", recommendation: { type: "paid-proven-organic-needed", message: "converted" } })], []
    );
    const contentRec = recs.find((r) => r.bridge === "GoogleAds→SEO");
    expect(contentRec).toBeDefined();
    expect(contentRec?.title).toContain("back pain chair");
  });

  it("ignores search terms that are just being monitored", () => {
    const recs = generateCrossChannelRecommendations([], [term({ recommendation: { type: "monitor", message: "" } })], []);
    expect(recs.find((r) => r.bridge === "GoogleAds→SEO")).toBeUndefined();
  });
});

describe("generateCrossChannelRecommendations — Meta to SEO bridge", () => {
  it("recommends an SEO content brief for creatives with CTR above 3%", () => {
    const recs = generateCrossChannelRecommendations([], [], [creative({ name: "winning ad", ctrThisWeek: 4.5 })]);
    const metaRec = recs.find((r) => r.bridge === "Meta→SEO");
    expect(metaRec).toBeDefined();
    expect(metaRec?.title).toContain("winning ad");
  });

  it("does not recommend for creatives at or below 3% CTR", () => {
    const recs = generateCrossChannelRecommendations([], [], [creative({ ctrThisWeek: 2.5 })]);
    expect(recs.find((r) => r.bridge === "Meta→SEO")).toBeUndefined();
  });
});

describe("generateCrossChannelRecommendations — SEO to Meta bridge", () => {
  it("recommends a Meta campaign for high-traffic top-3 organic pages", () => {
    const recs = generateCrossChannelRecommendations([kw({ keyword: "popular topic", currentPosition: 2, volume: 15000 })], [], []);
    expect(recs.find((r) => r.bridge === "SEO→Meta")).toBeDefined();
  });

  it("does not recommend for low-traffic pages even if top-3", () => {
    const recs = generateCrossChannelRecommendations([kw({ keyword: "niche topic", currentPosition: 2, volume: 500 })], [], []);
    expect(recs.find((r) => r.bridge === "SEO→Meta")).toBeUndefined();
  });
});

describe("generateCrossChannelRecommendations — overall behavior", () => {
  it("returns an empty array when there is nothing to recommend", () => {
    expect(generateCrossChannelRecommendations([], [], [])).toEqual([]);
  });

  it("sorts recommendations by impact: High before Medium before Low", () => {
    const recs = generateCrossChannelRecommendations(
      [kw({ keyword: "a", currentPosition: 6 }), kw({ keyword: "b", currentPosition: 1 })], [], []
    );
    const impacts = recs.map((r) => r.impact);
    const order = { High: 0, Medium: 1, Low: 2 };
    for (let i = 1; i < impacts.length; i++) {
      expect(order[impacts[i]]).toBeGreaterThanOrEqual(order[impacts[i - 1]]);
    }
  });
});
