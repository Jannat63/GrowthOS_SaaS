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

/**
 * Title case that leaves short function words alone.
 *
 * The naive `\w` uppercase produced "Best Office Chair For Back Pain" — "For" capitalised
 * mid-title. It goes straight into the recommended H1 and the meta title, both of which are now
 * rendered verbatim on the page for someone to copy into a CMS.
 */
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or",
  "the", "to", "up", "vs", "via", "with",
]);

/**
 * Acronyms search terms actually carry. Title case would otherwise render "gaming chair rgb" as
 * "Gaming Chair Rgb" in an H1 someone pastes into a CMS.
 */
const ACRONYMS = new Set(["rgb", "seo", "usb", "led", "tv", "pc", "hd", "uhd", "suv", "diy", "ac", "hvac"]);

function titleCase(s: string): string {
  const words = s.trim().split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (i > 0 && i < words.length - 1 && MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * "a" or "an" for the following phrase.
 *
 * The FAQ templates put an article in front of an arbitrary search term, and the first fix for the
 * doubled-superlative bug replaced one grammar error with another — "How much does a office chair
 * cost?". Vowel-initial is the right test for the overwhelming majority of product terms; the
 * handful of English exceptions (a "user", an "hour") are not shapes a commercial search term
 * takes, and guessing at them would cost more than it returns.
 */
function article(phrase: string): string {
  return /^[aeiou]/i.test(phrase.trim()) ? "an" : "a";
}

/**
 * The keyword with a leading qualifier removed, for slots that supply their own.
 *
 * Search terms routinely start with a superlative — "best office chair for back pain" is the
 * highest-converting term in the seeded set. Templates that prefix their own produced
 * "What is the best best office chair for back pain?" and "How to choose the right best office
 * chair for back pain". Both shipped: the brief was generated, persisted, and returned by the API
 * for months, and the page only ever rendered `headingStructure.length`, so no one read the text.
 *
 * Only a leading qualifier is stripped — "best chairs for back pain" keeps "back pain", because
 * the qualifier is only redundant in first position where the template adds one.
 */
const LEADING_QUALIFIERS = new Set(["best", "top", "cheap", "cheapest", "good", "great", "affordable"]);

export function coreTopic(keyword: string): string {
  const words = keyword.trim().split(/\s+/);
  if (words.length > 1 && LEADING_QUALIFIERS.has(words[0]!.toLowerCase())) {
    return words.slice(1).join(" ");
  }
  return keyword.trim();
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
