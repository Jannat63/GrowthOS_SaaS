import { compositeScore, type MappedRecommendation } from "./recommendation.js";
import type { ScoredKeyword } from "./engines/seo-scoring.js";
import { coreTopic, titleCase } from "./text.js";

export interface CreativeBrief {
  hook: string;
  primaryText: string;
  headline: string;
  format: string;
  audience: string;
  callToAction: string;
}

/**
 * What Meta shows before it truncates.
 *
 * These are hard constraints on the ad, not style guidance: primary text past 125 characters
 * collapses behind "See more", and a headline past 40 is cut mid-phrase in the feed. The generator
 * was writing straight past both — "best office chair for back pain" produced a 45-character
 * headline and 127 characters of primary text — and the page never displayed the headline at all,
 * so nothing surfaced it.
 */
export const META_LIMITS = {
  primaryText: 125,
  headline: 40,
} as const;

/**
 * A headline that fits.
 *
 * Tries the full keyword with the suffix, then the keyword without its leading qualifier, then the
 * bare topic. A keyword long enough to blow the budget on its own is left intact and reported over
 * budget rather than truncated — cutting a search term mid-phrase changes what the ad is about,
 * which is worse than a headline the buyer has to shorten by hand.
 */
function fitHeadline(keyword: string): string {
  const candidates = [
    `${titleCase(keyword)} — Made Simple`,
    `${titleCase(coreTopic(keyword))} — Made Simple`,
    titleCase(coreTopic(keyword)),
  ];
  return candidates.find((c) => c.length <= META_LIMITS.headline) ?? candidates[candidates.length - 1]!;
}

// Deterministic Meta creative brief template (D4 — Claude behind a flag later).
export function generateCreativeBrief(topic: string): CreativeBrief {
  const t = topic.trim();
  const core = coreTopic(t);
  return {
    // The creative angle, not ad copy — this is what the concept is, for whoever builds it.
    hook: `Still searching for the right ${core}?`,
    // Trimmed by one clause. The original ran to 127 characters for a realistic keyword, which
    // Meta collapses behind "See more" — the end of the sentence was never being read.
    primaryText: `Thousands find their ${core} through us. Here's what makes the difference.`,
    headline: fitHeadline(t),
    format: "Single image / short-form video",
    audience: `Cold — interest-based lookalikes around "${core}"`,
    callToAction: "Learn more",
  };
}

// Maps a top-performing organic keyword onto an organic_to_paid recommendation (amplify with Meta).
export function organicToPaidRecommendation(
  k: ScoredKeyword,
  workspaceId: string
): MappedRecommendation {
  const impactScore = Math.min(100, 45 + Math.round(k.volume / 1000));
  const effortScore = 50;
  const urgencyScore = 55;
  return {
    externalId: `o2p:${k.keyword}`,
    workspaceId,
    type: "organic_to_paid",
    sourceChannel: "seo",
    targetChannel: "meta_ads",
    title: `Amplify "${k.keyword}" with a Meta campaign`,
    body: `Ranking #${k.currentPosition ?? "—"} organically with ${k.volume.toLocaleString()}/mo demand — a proven top-of-funnel angle for cold Meta audiences.`,
    actionLabel: "Generate creative",
    impactScore,
    effortScore,
    urgencyScore,
    compositeScore: compositeScore(impactScore, urgencyScore, effortScore),
    status: "pending",
    rawData: k,
  };
}

/**
 * Runtime guards for the two brief shapes `content_briefs.brief` holds.
 *
 * One jsonb column stores a `ContentBrief` (paid -> organic, source `google_ads_search_term`) or a
 * `CreativeBrief` (organic -> paid, source `organic_top_page`). The Creative Queue reached for the
 * second with `brief as unknown as CreativeBrief` — a double cast, which is the type system being
 * told to stop objecting to a real ambiguity rather than the ambiguity being resolved. Nothing
 * checked at runtime, so a row of the other shape rendered a card of blank fields with no error.
 *
 * Structural rather than keyed off `source`, because `source` is a plain text column with four
 * documented values and no constraint enforcing which shape accompanies which.
 */
export function isCreativeBrief(b: unknown): b is CreativeBrief {
  return typeof b === 'object' && b !== null && 'hook' in b && 'headline' in b && 'callToAction' in b
}
