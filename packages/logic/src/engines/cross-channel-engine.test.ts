import { describe, it, expect } from "vitest";
import { generateCrossChannelRecommendations, listRules, type EngineSignals } from "./cross-channel-engine.js";
import { ScoredKeyword } from "./seo-scoring.js";
import { AnalyzedSearchTerm } from "./search-terms-bridge.js";
import { FatigueResult } from "./creative-fatigue.js";
import { CampaignInsight } from "./google-ads-advisor.js";

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

function campaign(overrides: Partial<CampaignInsight>): CampaignInsight {
  return {
    id: "c1", name: "test campaign", clicks: 100, conversions: 5, cost: 500, conversionValue: 1500,
    qualityScore: 8, cpa: 100, roas: 3, conversionRate: 0.05, status: "healthy", recommendation: "",
    ...overrides,
  };
}

const empty: EngineSignals = { keywords: [], searchTerms: [], creatives: [], googleCampaigns: [], metaCampaigns: [] };

describe("generateCrossChannelRecommendations — SEO to Google Ads bridge", () => {
  it("recommends launching Google Ads for a keyword ranking 4-10", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "chair", currentPosition: 6 })] });
    expect(recs.find((r) => r.bridge === "SEO→GoogleAds" && r.title.includes("Launch"))).toBeDefined();
  });

  it("does NOT recommend launching Google Ads for a keyword ranking #1-3", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "chair", currentPosition: 2, volume: 100 })] });
    expect(recs.find((r) => r.bridge === "SEO→GoogleAds" && r.title.includes("Launch"))).toBeUndefined();
  });

  it("does NOT recommend launching for a keyword ranking beyond position 10", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "chair", currentPosition: 20 })] });
    expect(recs.find((r) => r.bridge === "SEO→GoogleAds" && r.title.includes("Launch"))).toBeUndefined();
  });

  it("recommends reducing paid spend for a keyword ranking #1-3", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "chair", currentPosition: 1 })] });
    expect(recs.find((r) => r.title.includes("Reduce paid spend"))).toBeDefined();
  });

  it("recommends paid coverage for a keyword with a large competitor gap and no ranking", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "gap term", currentPosition: null, competitorGapCount: 6 })] });
    expect(recs.find((r) => r.title.includes("Capture") && r.bridge === "SEO→GoogleAds")).toBeDefined();
  });

  it("does not recommend paid coverage when the competitor gap is small", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "gap term", currentPosition: null, competitorGapCount: 2 })] });
    expect(recs.find((r) => r.title.includes("Capture"))).toBeUndefined();
  });

  it("recommends fast-tracking a high-volume, high-difficulty, unranked keyword with paid", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "hard term", volume: 6000, difficulty: 80, currentPosition: null })] });
    expect(recs.find((r) => r.title.includes("Fast-track"))).toBeDefined();
  });

  it("does not recommend fast-tracking a low-difficulty keyword", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "easy term", volume: 6000, difficulty: 20, currentPosition: null })] });
    expect(recs.find((r) => r.title.includes("Fast-track"))).toBeUndefined();
  });

  it("recommends reducing bid when a search term already ranks top-3 organically", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      searchTerms: [term({ term: "covered term", recommendation: { type: "reduce-bid-organic-covers", message: "already ranks #2" } })],
    });
    const rec = recs.find((r) => r.title.includes("Reduce bid"));
    expect(rec).toBeDefined();
    expect(rec?.bridge).toBe("SEO→GoogleAds");
  });
});

describe("generateCrossChannelRecommendations — Google Ads to SEO bridge", () => {
  it("surfaces paid-proven-organic-needed search terms as SEO content recommendations", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      searchTerms: [term({ term: "back pain chair", recommendation: { type: "paid-proven-organic-needed", message: "converted" } })],
    });
    const contentRec = recs.find((r) => r.bridge === "GoogleAds→SEO" && r.title.includes("back pain chair"));
    expect(contentRec).toBeDefined();
  });

  it("ignores search terms that are just being monitored", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, searchTerms: [term({ recommendation: { type: "monitor", message: "" } })] });
    expect(recs.find((r) => r.id.startsWith("searchterm-proven-to-seo"))).toBeUndefined();
  });

  it("recommends building organic coverage for a high-severity wasted-spend campaign", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      googleCampaigns: [campaign({ id: "waste1", name: "wasteful", clicks: 1000, conversions: 0, cost: 900, conversionValue: 0 })],
    });
    expect(recs.find((r) => r.bridge === "GoogleAds→SEO" && r.title.includes("Build organic coverage"))).toBeDefined();
  });

  it("recommends a landing-page audit for a campaign with a poor Quality Score", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, googleCampaigns: [campaign({ id: "lowqs", name: "low qs", qualityScore: 3 })] });
    expect(recs.find((r) => r.title.includes("Audit the landing page"))).toBeDefined();
  });

  it("does not flag a campaign with a healthy Quality Score", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, googleCampaigns: [campaign({ qualityScore: 9 })] });
    expect(recs.find((r) => r.title.includes("Audit the landing page"))).toBeUndefined();
  });
});

describe("generateCrossChannelRecommendations — Meta to SEO bridge", () => {
  it("recommends an SEO content brief for creatives with CTR above 3%", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, creatives: [creative({ name: "winning ad", ctrThisWeek: 4.5 })] });
    const metaRec = recs.find((r) => r.bridge === "Meta→SEO" && r.title.includes("winning ad"));
    expect(metaRec).toBeDefined();
  });

  it("does not recommend for creatives at or below 3% CTR", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, creatives: [creative({ ctrThisWeek: 2.5 })] });
    expect(recs.find((r) => r.id.startsWith("meta-high-ctr-to-seo-brief"))).toBeUndefined();
  });

  it("preserves a fatigued creative's hook as SEO content if it was strong last week", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, creatives: [creative({ name: "old winner", status: "fatigued", ctrLastWeek: 4 })] });
    expect(recs.find((r) => r.title.includes("Preserve"))).toBeDefined();
  });

  it("does not suggest preserving a fatigued creative that was never strong", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, creatives: [creative({ status: "fatigued", ctrLastWeek: 1 })] });
    expect(recs.find((r) => r.title.includes("Preserve"))).toBeUndefined();
  });
});

describe("generateCrossChannelRecommendations — SEO to Meta bridge", () => {
  it("recommends a Meta campaign for high-traffic top-3 organic pages", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "popular topic", currentPosition: 2, volume: 15000 })] });
    expect(recs.find((r) => r.bridge === "SEO→Meta" && r.id.startsWith("seo-top-traffic"))).toBeDefined();
  });

  it("does not recommend for low-traffic pages even if top-3", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "niche topic", currentPosition: 2, volume: 500 })] });
    expect(recs.find((r) => r.id.startsWith("seo-top-traffic"))).toBeUndefined();
  });

  it("recommends a Meta authority campaign for high GEO-citation-potential keywords", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "authority topic", geoCitationPotential: 85 })] });
    expect(recs.find((r) => r.title.includes("Reinforce"))).toBeDefined();
  });

  it("recommends Meta awareness for a high-volume, high-gap, unranked keyword", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, keywords: [kw({ keyword: "awareness topic", volume: 6000, competitorGapCount: 7, currentPosition: null })] });
    expect(recs.find((r) => r.title.includes("Build demand"))).toBeDefined();
  });
});

describe("generateCrossChannelRecommendations — Google Ads to Meta bridge", () => {
  it("recommends testing a scale-status campaign's offer on Meta", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, googleCampaigns: [campaign({ name: "winner", status: "scale", roas: 5 })] });
    const rec = recs.find((r) => r.title.includes("Test") && r.bridge === "GoogleAds→Meta");
    expect(rec).toBeDefined();
  });

  it("does not recommend testing on Meta for a merely healthy campaign", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, googleCampaigns: [campaign({ status: "healthy" })] });
    expect(recs.find((r) => r.id.startsWith("ads-scale-campaign-to-meta-test"))).toBeUndefined();
  });

  it("recommends reallocating high-severity wasted spend to Meta", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      googleCampaigns: [campaign({ name: "wasteful", clicks: 1000, conversions: 0, cost: 900, conversionValue: 0 })],
    });
    expect(recs.find((r) => r.bridge === "GoogleAds→Meta" && r.title.includes("Reallocate"))).toBeDefined();
  });

  it("recommends a Meta lookalike for a high-converting, low-volume campaign", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      googleCampaigns: [campaign({ name: "hidden gem", clicks: 200, conversions: 15, conversionRate: 0.075 })],
    });
    expect(recs.find((r) => r.title.includes("lookalike"))).toBeDefined();
  });

  it("does not recommend a lookalike for a high-volume campaign (no headroom signal)", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      googleCampaigns: [campaign({ clicks: 5000, conversions: 300, conversionRate: 0.06 })],
    });
    expect(recs.find((r) => r.title.includes("lookalike"))).toBeUndefined();
  });
});

describe("generateCrossChannelRecommendations — Meta to Google Ads bridge", () => {
  it("recommends extending a healthy, fresh, high-CTR creative into Google Ads", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      creatives: [creative({ name: "fresh winner", status: "healthy", ctrThisWeek: 3, frequency: 1 })],
    });
    expect(recs.find((r) => r.bridge === "Meta→GoogleAds" && r.title.includes("Extend"))).toBeDefined();
  });

  it("does not recommend extension for a high-frequency (worn out) creative", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      creatives: [creative({ status: "healthy", ctrThisWeek: 3, frequency: 3 })],
    });
    expect(recs.find((r) => r.title.includes("Extend"))).toBeUndefined();
  });

  it("recommends shifting a fatigued creative's budget to Google Ads remarketing", () => {
    const recs = generateCrossChannelRecommendations({ ...empty, creatives: [creative({ name: "worn out", status: "fatigued" })] });
    expect(recs.find((r) => r.bridge === "Meta→GoogleAds" && r.title.includes("remarketing"))).toBeDefined();
  });
});

describe("generateCrossChannelRecommendations — blended MER cross-cutting rule", () => {
  it("recommends reviewing allocation when blended MER is below the healthy 2x benchmark", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      googleCampaigns: [campaign({ cost: 1000, conversionValue: 800 })],
      metaCampaigns: [campaign({ cost: 1000, conversionValue: 800 })],
    });
    expect(recs.find((r) => r.id === "mer-below-target-reallocate")).toBeDefined();
  });

  it("recommends scaling the underinvested channel when blended MER is excellent (>=4x)", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      googleCampaigns: [campaign({ cost: 1000, conversionValue: 5000 })],
      metaCampaigns: [campaign({ cost: 200, conversionValue: 1000 })],
    });
    const rec = recs.find((r) => r.id === "mer-excellent-scale-underinvested");
    expect(rec).toBeDefined();
    // Meta has the smaller spend share (200 vs 1000) — the recommendation should point there.
    expect(rec?.bridge).toBe("GoogleAds→Meta");
    expect(rec?.title).toContain("Meta");
  });

  it("says nothing when blended MER is within the healthy 2x-4x range", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      googleCampaigns: [campaign({ cost: 1000, conversionValue: 3000 })],
      metaCampaigns: [campaign({ cost: 1000, conversionValue: 3000 })],
    });
    expect(recs.find((r) => r.id === "mer-below-target-reallocate" || r.id === "mer-excellent-scale-underinvested")).toBeUndefined();
  });

  it("says nothing when there is no spend on either channel", () => {
    const recs = generateCrossChannelRecommendations(empty);
    expect(recs.find((r) => r.id.startsWith("mer-"))).toBeUndefined();
  });
});

describe("generateCrossChannelRecommendations — overall behavior", () => {
  it("returns an empty array when there is nothing to recommend", () => {
    expect(generateCrossChannelRecommendations(empty)).toEqual([]);
  });

  it("sorts recommendations by impact: High before Medium before Low", () => {
    const recs = generateCrossChannelRecommendations({
      ...empty,
      keywords: [kw({ keyword: "a", currentPosition: 6 }), kw({ keyword: "b", currentPosition: 1 })],
    });
    const order = { High: 0, Medium: 1, Low: 2 };
    for (let i = 1; i < recs.length; i++) {
      expect(order[recs[i].impact]).toBeGreaterThanOrEqual(order[recs[i - 1].impact]);
    }
  });
});

describe("listRules", () => {
  it("exposes every rule with a stable id, bridge, and description", () => {
    const rules = listRules();
    expect(rules.length).toBeGreaterThanOrEqual(19);
    for (const r of rules) {
      expect(r.id).toBeTruthy();
      expect(r.description).toBeTruthy();
    }
    // Every bridge direction has at least one real rule behind it.
    const bridges = new Set(rules.map((r) => r.bridge));
    expect(bridges).toEqual(
      new Set(["SEO→GoogleAds", "GoogleAds→SEO", "Meta→SEO", "SEO→Meta", "GoogleAds→Meta", "Meta→GoogleAds"]),
    );
  });
});
