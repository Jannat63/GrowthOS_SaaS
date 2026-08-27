import { compositeScore, type MappedRecommendation } from "./recommendation.js";
import type { AnalyzedSearchTerm } from "./engines/search-terms-bridge.js";
import { article, coreTopic, titleCase } from "./text.js";

export interface ContentBrief {
  recommendedH1: string;
  wordCount: number;
  headingStructure: string[];
  entities: string[];
  faqQuestions: string[];
  metaTitle: string;
  metaDescription: string;
  internalLinkTargets: string[];
  schemaType: string;
}

// Deterministic template brief (D4 — Claude behind a flag later).
export function generateContentBrief(keyword: string): ContentBrief {
  const k = keyword.trim();
  const topic = coreTopic(k);
  const title = titleCase(k);
  return {
    recommendedH1: `${title}: The Complete Guide`,
    // A target, not a measurement — the same figure for every brief. Rendered as "target length"
    // rather than an estimate, because presenting a constant as a per-keyword prediction is the
    // kind of fake precision this codebase has had to walk back elsewhere.
    wordCount: 1500,
    headingStructure: [
      `What to know about ${topic}`,
      // Was `How to choose the right ${k}` -> "the right best office chair for back pain". The
      // section sits under a keyword-titled H1, so "the right one" is unambiguous and stays
      // grammatical whatever the keyword is.
      `How to choose the right one`,
      `Top considerations`,
      `Frequently asked questions`,
    ],
    entities: [...new Set(topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3))],
    faqQuestions: [
      `What is the best ${topic}?`,
      `How much does ${article(topic)} ${topic} cost?`,
      `Is ${article(topic)} ${topic} worth it?`,
    ],
    metaTitle: `${title} — Buyer's Guide`,
    metaDescription: `Everything you need to know about ${topic}: how to choose, what to look for, and top picks.`,
    internalLinkTargets: [],
    schemaType: "Article",
  };
}

// Maps a "paid-proven, organic-needed" search term onto a paid_to_organic recommendation.
export function paidToOrganicRecommendation(
  t: AnalyzedSearchTerm,
  workspaceId: string
): MappedRecommendation {
  const impactScore = Math.min(100, 40 + t.conversions * 2);
  const effortScore = 55;
  const urgencyScore = 65;
  return {
    externalId: `p2o:${t.term}`,
    workspaceId,
    type: "paid_to_organic",
    sourceChannel: "google_ads",
    targetChannel: "seo",
    title: `Create SEO content for "${t.term}"`,
    body: t.recommendation.message,
    actionLabel: "Generate brief",
    impactScore,
    effortScore,
    urgencyScore,
    compositeScore: compositeScore(impactScore, urgencyScore, effortScore),
    status: "pending",
    rawData: t,
  };
}

/** Companion to `isCreativeBrief` — see there for why these are structural, not source-keyed. */
export function isContentBrief(b: unknown): b is ContentBrief {
  return (
    typeof b === "object" && b !== null && "recommendedH1" in b && "headingStructure" in b
  );
}
