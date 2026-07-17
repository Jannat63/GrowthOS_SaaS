// Real logic implementing the Section 3.3 "Three-Channel Insight Loop" —
// reads output from SEO, Google Ads, and Meta Ads modules and generates
// cross-channel recommendations. This is the platform's core differentiator.

import { ScoredKeyword } from "./seo-scoring.js";
import { AnalyzedSearchTerm } from "./search-terms-bridge.js";
import { FatigueResult } from "./creative-fatigue.js";

export interface CrossChannelRecommendation {
  id: string;
  bridge: "SEO→GoogleAds" | "GoogleAds→SEO" | "Meta→SEO" | "SEO→Meta";
  title: string;
  message: string;
  impact: "High" | "Medium" | "Low";
}

export function generateCrossChannelRecommendations(
  keywords: ScoredKeyword[],
  searchTerms: AnalyzedSearchTerm[],
  fatigueResults: FatigueResult[]
): CrossChannelRecommendation[] {
  const recs: CrossChannelRecommendation[] = [];

  // Rule: SEO → Google Ads
  // "keyword ranks organically in positions 4–10 → recommend a Google Ads campaign"
  keywords
    .filter((k) => k.currentPosition !== null && k.currentPosition >= 4 && k.currentPosition <= 10)
    .forEach((k) => {
      recs.push({
        id: `seo-to-ads-${k.keyword}`,
        bridge: "SEO→GoogleAds",
        title: `Launch Google Ads for "${k.keyword}"`,
        message: `Ranking #${k.currentPosition} organically — a paid ad guarantees top placement while SEO continues climbing.`,
        impact: "High",
      });
    });

  // Rule: SEO → Google Ads (pause candidates)
  // "keywords where the site already ranks #1–3 organically are flagged as candidates for pausing paid spend"
  keywords
    .filter((k) => k.currentPosition !== null && k.currentPosition <= 3)
    .forEach((k) => {
      recs.push({
        id: `pause-paid-${k.keyword}`,
        bridge: "SEO→GoogleAds",
        title: `Reduce paid spend on "${k.keyword}"`,
        message: `Already ranking #${k.currentPosition} organically — redirect this budget to a higher-impact keyword.`,
        impact: "Medium",
      });
    });

  // Rule: Google Ads → SEO
  // "highest-converting Google Ads search terms surfaced as priority SEO content opportunities"
  searchTerms
    .filter((t) => t.recommendation.type === "paid-proven-organic-needed")
    .forEach((t) => {
      recs.push({
        id: `ads-to-seo-${t.term}`,
        bridge: "GoogleAds→SEO",
        title: `Create SEO content for "${t.term}"`,
        message: t.recommendation.message,
        impact: "High",
      });
    });

  // Rule: Meta Ads → SEO
  // "Meta ad creative achieves a CTR above 3% → generates an SEO content brief using the same angle"
  fatigueResults
    .filter((c) => c.ctrThisWeek > 3)
    .forEach((c) => {
      recs.push({
        id: `meta-to-seo-${c.name}`,
        bridge: "Meta→SEO",
        title: `Turn "${c.name}" into an SEO content brief`,
        message: `This creative has a ${c.ctrThisWeek.toFixed(1)}% CTR — proven audience resonance. Convert the hook into an organic content angle.`,
        impact: "Medium",
      });
    });

  // Rule: SEO → Meta Ads
  // "top 10 performing organic pages by traffic → suggest Meta ad campaigns targeting cold audiences"
  keywords
    .filter((k) => k.currentPosition !== null && k.currentPosition <= 3 && k.volume > 8000)
    .forEach((k) => {
      recs.push({
        id: `seo-to-meta-${k.keyword}`,
        bridge: "SEO→Meta",
        title: `Build a Meta cold campaign around "${k.keyword}"`,
        message: `High organic traffic (${k.volume.toLocaleString()}/mo) on this topic is a proven top-of-funnel creative brief for Meta.`,
        impact: "Medium",
      });
    });

  const impactOrder = { High: 0, Medium: 1, Low: 2 };
  return recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
}
