import { describe, it, expect } from "vitest";
import { compositeScore, toRecommendation } from "./recommendation.js";

describe("compositeScore", () => {
  it("weights impact/urgency/effort", () => {
    expect(compositeScore(90, 60, 30)).toBe(
      Math.round(90 * 0.5 + 60 * 0.35 + (100 - 30) * 0.15)
    );
  });
});

describe("toRecommendation", () => {
  it("maps a bridge rec to channels + scores", () => {
    const r = toRecommendation(
      { id: "x", bridge: "SEO→GoogleAds", title: "T", message: "M", impact: "High" },
      "ws1"
    );
    expect(r.sourceChannel).toBe("seo");
    expect(r.targetChannel).toBe("google_ads");
    expect(r.impactScore).toBe(90);
    expect(r.status).toBe("pending");
    expect(r.compositeScore).toBeGreaterThan(0);
  });
});

describe("overlap between the cross-channel engine and the specialised generators", () => {
  it("still produces identical titles for the same search term", async () => {
    // This is not asserting desirable behaviour — it is pinning the premise that two consumers
    // depend on. `dedupeAgainstSpecialisedRows` (apps/api/src/recommendations.ts) and
    // `buildOfflineQueue` (apps/web/lib/hooks/useRecommendations.ts) both de-duplicate the queue by
    // matching on TITLE, because the two generators share no id.
    //
    // If either title string is reworded, the match silently stops finding anything, both dedupes
    // become no-ops, and the duplicate rows quietly come back. Nothing else would fail. So the
    // exact collision is asserted here, where the strings live.
    const { analyzeSearchTerms } = await import("./engines/search-terms-bridge.js");
    const { paidToOrganicRecommendation } = await import("./content-brief.js");
    const { searchTerms } = await import("./fixtures.js");

    const term = analyzeSearchTerms(searchTerms).find(
      (t) => t.recommendation.type === "paid-proven-organic-needed"
    );
    expect(term, "fixtures must contain a paid-proven term").toBeDefined();

    const specialised = paidToOrganicRecommendation(term!, "ws1");
    const crossChannel = toRecommendation(
      {
        id: "x",
        bridge: "GoogleAds→SEO",
        // The cross-channel engine's own template — cross-channel-engine.ts.
        title: `Create SEO content for "${term!.term}"`,
        message: "M",
        impact: "High",
      },
      "ws1"
    );

    expect(specialised.title).toBe(crossChannel.title);
    // ...and they disagree on priority, which is what made the duplicate visible to users as the
    // same sentence twice with two different numbers.
    expect(specialised.compositeScore).not.toBe(0);
    expect(specialised.type).not.toBe(crossChannel.type);
  });
});
