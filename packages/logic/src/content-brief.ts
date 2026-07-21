import { compositeScore, type MappedRecommendation } from "./recommendation.js";
import type { AnalyzedSearchTerm } from "./engines/search-terms-bridge.js";

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

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Deterministic template brief (D4 — Claude behind a flag later).
export function generateContentBrief(keyword: string): ContentBrief {
  const k = keyword.trim();
  const title = titleCase(k);
  return {
    recommendedH1: `${title}: The Complete Guide`,
    wordCount: 1500,
    headingStructure: [
      `What to know about ${k}`,
      `How to choose the right ${k}`,
      `Top considerations`,
      `FAQ`,
    ],
    entities: k.split(/\s+/).filter((w) => w.length > 3),
    faqQuestions: [
      `What is the best ${k}?`,
      `How much does ${k} cost?`,
      `Is ${k} worth it?`,
    ],
    metaTitle: `${title} — Buyer's Guide`,
    metaDescription: `Everything you need to know about ${k}: how to choose, what to look for, and top picks.`,
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
