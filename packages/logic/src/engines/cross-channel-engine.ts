// Real logic implementing Section 3.3 "Three-Channel Insight Loop" — reads output from the SEO,
// Google Ads, and Meta Ads modules and generates cross-channel recommendations. This is the
// platform's core differentiator.
//
// Organized as a rule registry (one small pure function per rule) rather than one long function —
// each rule is independently readable, testable, and traceable back to the specific signal that
// triggered it. The blueprint's roadmap names an aspirational "47 cross-channel rules engine" but
// never enumerates what those 47 are anywhere in the docs; there's no real spec to hit that number
// against. What's here is a genuine ~4x expansion of the original 5 rules — 19 registry entries
// (one of which, the blended-MER rule, produces one of two distinct recommendation outputs
// depending on data, so 20 distinct recommendation types in total) spanning all 6 possible
// channel-pair bridges, each grounded in a real field from an existing engine's output. Padding to
// an arbitrary count with near-duplicate rules would have made the recommendation feed noisier,
// not smarter.

import { ScoredKeyword } from "./seo-scoring.js";
import { AnalyzedSearchTerm } from "./search-terms-bridge.js";
import { FatigueResult } from "./creative-fatigue.js";
import { CampaignInsight, detectWastedSpend } from "./google-ads-advisor.js";
import { calculateBlendedMER } from "./blended-mer.js";

export type Bridge =
  | "SEO→GoogleAds"
  | "GoogleAds→SEO"
  | "Meta→SEO"
  | "SEO→Meta"
  | "GoogleAds→Meta"
  | "Meta→GoogleAds";

export interface CrossChannelRecommendation {
  id: string;
  bridge: Bridge;
  title: string;
  message: string;
  impact: "High" | "Medium" | "Low";
}

export interface EngineSignals {
  keywords: ScoredKeyword[];
  searchTerms: AnalyzedSearchTerm[];
  creatives: FatigueResult[];
  googleCampaigns: CampaignInsight[];
  metaCampaigns: CampaignInsight[];
}

type Rule = {
  id: string;
  bridge: Bridge;
  /** One-line description of the trigger — surfaced nowhere in the product yet, but keeps the registry self-documenting. */
  description: string;
  evaluate: (s: EngineSignals) => CrossChannelRecommendation[];
};

const RULES: Rule[] = [
  // ── SEO → Google Ads ──────────────────────────────────────────────────────────────────
  {
    id: "seo-striking-distance-to-ads",
    bridge: "SEO→GoogleAds",
    description: "Ranks #4-10 organically → paid guarantees top placement while SEO climbs.",
    evaluate: (s) =>
      s.keywords
        .filter((k) => k.currentPosition !== null && k.currentPosition >= 4 && k.currentPosition <= 10)
        .map((k) => ({
          id: `seo-striking-distance-to-ads-${k.keyword}`,
          bridge: "SEO→GoogleAds",
          title: `Launch Google Ads for "${k.keyword}"`,
          message: `Ranking #${k.currentPosition} organically — a paid ad guarantees top placement while SEO continues climbing.`,
          impact: "High",
        })),
  },
  {
    id: "seo-top3-pause-paid",
    bridge: "SEO→GoogleAds",
    description: "Ranks #1-3 organically → paid spend on the same term is largely redundant.",
    evaluate: (s) =>
      s.keywords
        .filter((k) => k.currentPosition !== null && k.currentPosition <= 3)
        .map((k) => ({
          id: `seo-top3-pause-paid-${k.keyword}`,
          bridge: "SEO→GoogleAds",
          title: `Reduce paid spend on "${k.keyword}"`,
          message: `Already ranking #${k.currentPosition} organically — redirect this budget to a higher-impact keyword.`,
          impact: "Medium",
        })),
  },
  {
    id: "seo-competitor-gap-to-ads",
    bridge: "SEO→GoogleAds",
    description: "Not ranking + several top-10 competitors are → paid can hold the position while content is built.",
    evaluate: (s) =>
      s.keywords
        .filter(
          (k) =>
            (k.currentPosition === null || k.currentPosition > 10) && k.competitorGapCount >= 5,
        )
        .map((k) => ({
          id: `seo-competitor-gap-to-ads-${k.keyword}`,
          bridge: "SEO→GoogleAds",
          title: `Capture "${k.keyword}" with paid while content catches up`,
          message: `${k.competitorGapCount} of your top-10 competitors already rank here and you don't — a paid campaign holds the position while SEO content is built.`,
          impact: "Medium",
        })),
  },
  {
    id: "seo-high-difficulty-fast-track-ads",
    bridge: "SEO→GoogleAds",
    description: "High volume + high difficulty + not top-10 → organic will take a long time, paid is the faster path.",
    evaluate: (s) =>
      s.keywords
        .filter(
          (k) =>
            k.volume >= 5000 &&
            k.difficulty >= 70 &&
            (k.currentPosition === null || k.currentPosition > 10),
        )
        .map((k) => ({
          id: `seo-high-difficulty-fast-track-ads-${k.keyword}`,
          bridge: "SEO→GoogleAds",
          title: `Fast-track "${k.keyword}" with paid`,
          message: `Difficulty ${k.difficulty}/100 on a ${k.volume.toLocaleString()}/mo term — organic ranking will take a while here. Paid gets you visibility now.`,
          impact: "Medium",
        })),
  },
  {
    id: "searchterm-reduce-bid-organic-covers",
    bridge: "SEO→GoogleAds",
    description: "A converting paid search term already ranks top-3 organically → reduce the bid.",
    evaluate: (s) =>
      s.searchTerms
        .filter((t) => t.recommendation.type === "reduce-bid-organic-covers")
        .map((t) => ({
          id: `searchterm-reduce-bid-organic-covers-${t.term}`,
          bridge: "SEO→GoogleAds",
          title: `Reduce bid on "${t.term}"`,
          message: t.recommendation.message,
          impact: "Medium",
        })),
  },

  // ── Google Ads → SEO ──────────────────────────────────────────────────────────────────
  {
    id: "searchterm-proven-to-seo",
    bridge: "GoogleAds→SEO",
    description: "A search term converts via paid but has no ranking SEO content → priority content brief.",
    evaluate: (s) =>
      s.searchTerms
        .filter((t) => t.recommendation.type === "paid-proven-organic-needed")
        .map((t) => ({
          id: `searchterm-proven-to-seo-${t.term}`,
          bridge: "GoogleAds→SEO",
          title: `Create SEO content for "${t.term}"`,
          message: t.recommendation.message,
          impact: "High",
        })),
  },
  {
    id: "wasted-spend-to-seo-content",
    bridge: "GoogleAds→SEO",
    description: "A high-severity wasted-spend campaign → build organic coverage so future traffic doesn't depend on it.",
    evaluate: (s) =>
      detectWastedSpend(s.googleCampaigns)
        .filter((f) => f.severity === "High")
        .map((f) => ({
          id: `wasted-spend-to-seo-content-${f.campaign}`,
          bridge: "GoogleAds→SEO",
          title: `Build organic coverage for "${f.campaign}"`,
          message: `${f.issue} ($${f.wastedSpend.toLocaleString()} wasted) — organic content for this topic reduces reliance on spend that isn't converting.`,
          impact: "Medium",
        })),
  },
  {
    id: "low-quality-score-to-seo-landing-page",
    bridge: "GoogleAds→SEO",
    description: "Poor Quality Score often traces back to weak ad-to-landing-page relevance — an SEO/content fix, not just a bidding one.",
    evaluate: (s) =>
      s.googleCampaigns
        .filter((c) => c.qualityScore !== undefined && c.qualityScore <= 4)
        .map((c) => ({
          id: `low-quality-score-to-seo-landing-page-${c.id}`,
          bridge: "GoogleAds→SEO",
          title: `Audit the landing page for "${c.name}"`,
          message: `Quality Score ${c.qualityScore}/10 — often a landing-page relevance problem, not just a bidding one. Improving on-page content usually lifts this.`,
          impact: "Medium",
        })),
  },

  // ── Meta → SEO ────────────────────────────────────────────────────────────────────────
  {
    id: "meta-high-ctr-to-seo-brief",
    bridge: "Meta→SEO",
    description: "A creative with CTR > 3% has proven audience resonance → turn the hook into a content angle.",
    evaluate: (s) =>
      s.creatives
        .filter((c) => c.ctrThisWeek > 3)
        .map((c) => ({
          id: `meta-high-ctr-to-seo-brief-${c.name}`,
          bridge: "Meta→SEO",
          title: `Turn "${c.name}" into an SEO content brief`,
          message: `This creative has a ${c.ctrThisWeek.toFixed(1)}% CTR — proven audience resonance. Convert the hook into an organic content angle.`,
          impact: "Medium",
        })),
  },
  {
    id: "meta-fatigued-preserve-hook-to-seo",
    bridge: "Meta→SEO",
    description: "A fatigued creative that was previously a strong performer → capture the hook in content before it's retired.",
    evaluate: (s) =>
      s.creatives
        .filter((c) => c.status === "fatigued" && c.ctrLastWeek > 3)
        .map((c) => ({
          id: `meta-fatigued-preserve-hook-to-seo-${c.name}`,
          bridge: "Meta→SEO",
          title: `Preserve "${c.name}"'s hook as SEO content`,
          message: `This creative is fatigued now, but had a ${c.ctrLastWeek.toFixed(1)}% CTR last week. Capture that proven angle as an organic content piece before it's fully retired.`,
          impact: "Low",
        })),
  },

  // ── SEO → Meta ────────────────────────────────────────────────────────────────────────
  {
    id: "seo-top-traffic-to-meta-cold",
    bridge: "SEO→Meta",
    description: "Top-ranking, high-volume organic topics are proven top-of-funnel briefs for Meta cold audiences.",
    evaluate: (s) =>
      s.keywords
        .filter((k) => k.currentPosition !== null && k.currentPosition <= 3 && k.volume > 8000)
        .map((k) => ({
          id: `seo-top-traffic-to-meta-cold-${k.keyword}`,
          bridge: "SEO→Meta",
          title: `Build a Meta cold campaign around "${k.keyword}"`,
          message: `High organic traffic (${k.volume.toLocaleString()}/mo) on this topic is a proven top-of-funnel creative brief for Meta.`,
          impact: "Medium",
        })),
  },
  {
    id: "seo-geo-citation-to-meta-authority",
    bridge: "SEO→Meta",
    description: "High AI-citation potential signals topical authority worth reinforcing with a Meta awareness push.",
    evaluate: (s) =>
      s.keywords
        .filter((k) => k.geoCitationPotential >= 70)
        .map((k) => ({
          id: `seo-geo-citation-to-meta-authority-${k.keyword}`,
          bridge: "SEO→Meta",
          title: `Reinforce "${k.keyword}" authority on Meta`,
          message: `High AI-citation potential (${k.geoCitationPotential}/100) signals real topical authority on this subject — a Meta awareness campaign compounds that signal.`,
          impact: "Low",
        })),
  },
  {
    id: "seo-competitor-gap-to-meta-awareness",
    bridge: "SEO→Meta",
    description: "High-volume, high-competitor-gap topic not yet ranking → build brand demand on Meta while content develops.",
    evaluate: (s) =>
      s.keywords
        .filter(
          (k) =>
            k.volume >= 5000 &&
            k.competitorGapCount >= 5 &&
            (k.currentPosition === null || k.currentPosition > 10),
        )
        .map((k) => ({
          id: `seo-competitor-gap-to-meta-awareness-${k.keyword}`,
          bridge: "SEO→Meta",
          title: `Build demand for "${k.keyword}" on Meta`,
          message: `${k.competitorGapCount} competitors already rank here and you're not visible yet — a Meta awareness campaign builds brand demand while SEO content catches up.`,
          impact: "Low",
        })),
  },

  // ── Google Ads → Meta ─────────────────────────────────────────────────────────────────
  {
    id: "ads-scale-campaign-to-meta-test",
    bridge: "GoogleAds→Meta",
    description: "A proven, scale-status Google Ads campaign's offer/audience is worth testing on Meta too.",
    evaluate: (s) =>
      s.googleCampaigns
        .filter((c) => c.status === "scale")
        .map((c) => ({
          id: `ads-scale-campaign-to-meta-test-${c.id}`,
          bridge: "GoogleAds→Meta",
          title: `Test "${c.name}"'s offer on Meta`,
          message: `${c.roas.toFixed(1)}x ROAS on Google Ads — this offer and audience is proven. Worth testing the same angle on Meta to diversify demand.`,
          impact: "Medium",
        })),
  },
  {
    id: "ads-wasted-spend-to-meta-reallocation",
    bridge: "GoogleAds→Meta",
    description: "High-severity wasted Google Ads spend → reallocate that budget to Meta prospecting instead.",
    evaluate: (s) =>
      detectWastedSpend(s.googleCampaigns)
        .filter((f) => f.severity === "High")
        .map((f) => ({
          id: `ads-wasted-spend-to-meta-reallocation-${f.campaign}`,
          bridge: "GoogleAds→Meta",
          title: `Reallocate "${f.campaign}"'s budget to Meta`,
          message: `${f.issue} — this $${f.wastedSpend.toLocaleString()} is likely better spent prospecting on Meta than staying in an underperforming Google campaign.`,
          impact: "Medium",
        })),
  },
  {
    id: "ads-high-converter-low-volume-to-meta-lookalike",
    bridge: "GoogleAds→Meta",
    description: "A campaign converting well on limited traffic has headroom — a Meta lookalike audience extends reach.",
    evaluate: (s) =>
      s.googleCampaigns
        .filter((c) => c.conversionRate >= 0.05 && c.clicks < 500 && c.conversions > 0)
        .map((c) => ({
          id: `ads-high-converter-low-volume-to-meta-lookalike-${c.id}`,
          bridge: "GoogleAds→Meta",
          title: `Build a Meta lookalike from "${c.name}"'s converters`,
          message: `${(c.conversionRate * 100).toFixed(1)}% conversion rate on only ${c.clicks.toLocaleString()} clicks — this audience has real headroom. A Meta lookalike extends reach beyond what Google Ads alone can find.`,
          impact: "Medium",
        })),
  },

  // ── Meta → Google Ads ─────────────────────────────────────────────────────────────────
  {
    id: "meta-healthy-fresh-to-ads-expansion",
    bridge: "Meta→GoogleAds",
    description: "A healthy, low-frequency, high-CTR creative still has room to run — extend it into Google Ads too.",
    evaluate: (s) =>
      s.creatives
        .filter((c) => c.status === "healthy" && c.ctrThisWeek > 2.5 && c.frequency < 1.5)
        .map((c) => ({
          id: `meta-healthy-fresh-to-ads-expansion-${c.name}`,
          bridge: "Meta→GoogleAds",
          title: `Extend "${c.name}" into Google Ads`,
          message: `${c.ctrThisWeek.toFixed(1)}% CTR with frequency still low (${c.frequency.toFixed(1)}) — this creative concept has room to run. Try it in Google Ads Display/Performance Max too.`,
          impact: "Low",
        })),
  },
  {
    id: "meta-fatigued-to-ads-remarketing-shift",
    bridge: "Meta→GoogleAds",
    description: "A fatigued creative's budget can shift to Google Ads remarketing while the Meta side refreshes.",
    evaluate: (s) =>
      s.creatives
        .filter((c) => c.status === "fatigued")
        .map((c) => ({
          id: `meta-fatigued-to-ads-remarketing-shift-${c.name}`,
          bridge: "Meta→GoogleAds",
          title: `Shift "${c.name}"'s budget toward Google Ads remarketing`,
          message: c.message + " While this creative gets refreshed, shift its budget into Google Ads remarketing to keep reaching this audience.",
          impact: "Medium",
        })),
  },

  // ── Cross-cutting efficiency (blended MER) ───────────────────────────────────────────
  // Direction is data-driven: whichever channel currently has the smaller spend share is the
  // one with headroom to receive budget, so the bridge points there.
  {
    id: "mer-signal-to-reallocation",
    bridge: "GoogleAds→Meta", // placeholder — evaluate() below picks the real direction per-call
    description: "Blended MER outside the healthy 2x-4x range → recommend shifting budget toward the channel with spend headroom.",
    evaluate: (s) => {
      const googleSpend = s.googleCampaigns.reduce((sum, c) => sum + c.cost, 0);
      const metaSpend = s.metaCampaigns.reduce((sum, c) => sum + c.cost, 0);
      const totalRevenue = [...s.googleCampaigns, ...s.metaCampaigns].reduce((sum, c) => sum + c.conversionValue, 0);
      if (googleSpend + metaSpend === 0) return [];

      const mer = calculateBlendedMER({ totalRevenue, googleAdsSpend: googleSpend, metaAdsSpend: metaSpend });
      const underinvested: "google_ads" | "meta_ads" = googleSpend <= metaSpend ? "google_ads" : "meta_ads";
      const bridge: Bridge = underinvested === "meta_ads" ? "GoogleAds→Meta" : "Meta→GoogleAds";

      if (mer.blendedMER >= 4) {
        return [
          {
            id: "mer-excellent-scale-underinvested",
            bridge,
            title: `Scale ${underinvested === "meta_ads" ? "Meta" : "Google Ads"} — efficiency has headroom`,
            message: `${mer.interpretation} Blended MER is ${mer.blendedMER}x. ${
              underinvested === "meta_ads" ? "Meta" : "Google Ads"
            } currently has the smaller spend share — this is where extra budget is likely to compound best.`,
            impact: "Medium",
          },
        ];
      }
      if (mer.blendedMER > 0 && mer.blendedMER < 2) {
        return [
          {
            id: "mer-below-target-reallocate",
            bridge,
            title: "Review overall channel allocation",
            message: `${mer.interpretation} Blended MER is ${mer.blendedMER}x, below the healthy 2x benchmark — worth reviewing spend allocation across both channels before adding more budget to either.`,
            impact: "High",
          },
        ];
      }
      return [];
    },
  },
];

export function generateCrossChannelRecommendations(signals: EngineSignals): CrossChannelRecommendation[] {
  const recs = RULES.flatMap((rule) => rule.evaluate(signals));
  const impactOrder = { High: 0, Medium: 1, Low: 2 };
  return recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
}

/** The rule registry itself — exported for introspection/documentation (e.g. an admin "what rules exist" view), not required for normal use. */
export function listRules(): Array<Pick<Rule, "id" | "bridge" | "description">> {
  return RULES.map(({ id, bridge, description }) => ({ id, bridge, description }));
}
