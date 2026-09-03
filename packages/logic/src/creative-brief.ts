import type { CreativeBrief, CreativePlay } from "@growthos/types";
import { compositeScore, type MappedRecommendation } from "./recommendation.js";
import type { ScoredKeyword } from "./engines/seo-scoring.js";
import { article, coreTopic, titleCase } from "./text.js";

/**
 * `CreativeBrief` is declared once, in `@growthos/types`, and re-exported here.
 *
 * It used to be declared twice — once there for the DB record shape, once here for the generator's
 * return type — with nothing tying the two together. That is the same duplication that had already
 * silently drifted for `titleCase`, and adding a field to one copy would have reproduced it
 * exactly. `@growthos/types` has no dependencies, so depending on it from here is acyclic.
 */
export type { CreativeBrief, CreativePlay };

/**
 * The situation an organic->paid opportunity is in, which decides how the ad should open.
 *
 * This exists because the generator used to ignore every input except the keyword string, so
 * opportunities in genuinely different positions produced byte-identical ads.
 *
 * The split is the natural break in a page of organic results: **1-3** is the top of page one, a
 * position the site demonstrably owns, so the ad extends reach on strength. **4-10** is page one
 * below the fold, where the ad has to earn a click the ranking is not winning on its own.
 *
 * Paid proof deliberately is *not* a third play. Gating one on `paidProvenConversions >= 1` made
 * it swallow every keyword in the fixtures (42, 31 and 12 conversions), because a top-ranking
 * commercial term converting in paid is the normal case, not the exceptional one — and any
 * "enough conversions" constant would have been invented rather than measured. It modifies the
 * call to action instead, where the evidence actually bears: a term proven to sell can ask for the
 * sale, one with no paid history asks for the click.
 */
/** What the generator needs to tell the plays apart. `ScoredKeyword` satisfies it structurally. */
export interface CreativeBriefInput {
  keyword: string;
  volume: number;
  currentPosition: number | null;
  paidProvenConversions: number;
}

/**
 * What Meta shows before it truncates.
 *
 * These are hard constraints on the ad, not style guidance: primary text past 125 characters
 * collapses behind "See more", and a headline past 40 is cut mid-phrase in the feed.
 */
export const META_LIMITS = {
  primaryText: 125,
  headline: 40,
} as const;

/**
 * A headline that fits.
 *
 * Tries the full keyword with the play's suffix, then the keyword without its leading qualifier,
 * then the bare topic. A keyword long enough to blow the budget on its own is left intact and
 * reported over budget rather than truncated — cutting a search term mid-phrase changes what the
 * ad is about, which is worse than a headline the buyer has to shorten by hand.
 */
function fitHeadline(keyword: string, suffix: string): string {
  const candidates = [
    `${titleCase(keyword)} ${suffix}`,
    `${titleCase(coreTopic(keyword))} ${suffix}`,
    titleCase(coreTopic(keyword)),
  ];
  return (
    candidates.find((c) => c.length <= META_LIMITS.headline) ??
    candidates[candidates.length - 1]!
  );
}

/** Top of page one, or page one below the fold. An unranked keyword cannot be owned. */
export function creativePlay(k: CreativeBriefInput): CreativePlay {
  return k.currentPosition !== null && k.currentPosition <= 3 ? "own" : "claim";
}

/**
 * Whether the term has already been shown to sell, not merely to attract.
 *
 * Conversions on the exact term in Google Ads are the only evidence in this dataset that the
 * message closes. With it the ad can ask for the sale; without it, asking for the sale is a guess,
 * so the ad buys a cheaper action and the brief says the case is unproven.
 */
function proofOfSale(k: CreativeBriefInput) {
  const proven = k.paidProvenConversions >= 1;
  return {
    proven,
    callToAction: proven ? "Shop now" : "Learn more",
    clause: proven
      ? `${k.paidProvenConversions.toLocaleString()} conversion${
          k.paidProvenConversions === 1 ? "" : "s"
        } from this exact term in paid, so the ad can ask for the sale.`
      : `No paid conversion history on this term, so the ad buys the click rather than asking for the sale.`,
  };
}

/**
 * A deterministic Meta creative brief (D4 — no LLM in this path).
 *
 * Two things this deliberately does not do. It does not invent social proof: the previous template
 * opened every ad with "Thousands find their {topic} through us", a factual claim about the
 * customer's business that nothing in this product measures, generated straight into copy meant
 * for a live ad. And it does not truncate the keyword to make a field fit — see `fitHeadline`.
 */
export function generateCreativeBrief(input: CreativeBriefInput): CreativeBrief {
  const keyword = input.keyword.trim();
  const core = coreTopic(keyword);
  const a = article(core);
  const play = creativePlay(input);
  const pos = input.currentPosition;
  const sale = proofOfSale(input);
  const demand = `${input.volume.toLocaleString()}/mo`;

  if (play === "own") {
    return {
      play,
      rationale: `Ranking #${pos} on ${demand} demand — the page already wins this topic, so the ad extends reach rather than proving the offer. ${sale.clause}`,
      // The angle is a note to whoever builds the creative, not ad copy.
      hook: `Lead with authority — the site already ranks #${pos} for this.`,
      primaryText: `Everything worth knowing about choosing ${a} ${core}, in one place.`,
      headline: fitHeadline(keyword, "— Start Here"),
      format: "Single image / carousel",
      audience: `Cold — broad interest around "${core}"`,
      callToAction: sale.callToAction,
    };
  }

  return {
    play,
    rationale: `${demand} demand at position #${
      pos ?? "—"
    } — real volume the page is only mid-page for, so paid buys reach organic is not getting. ${sale.clause}`,
    hook: `Lead with the comparison — at #${pos ?? "—"} the ad has to earn the click.`,
    primaryText: `Choosing ${a} ${core}? Here's what actually matters before you buy.`,
    headline: fitHeadline(keyword, "— What to Compare"),
    format: "Short-form video / single image",
    audience: `Cold — interest lookalikes around "${core}", competitor-adjacent`,
    callToAction: sale.callToAction,
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
 * documented values and no constraint enforcing which shape accompanies which. Deliberately does
 * not test `play`: rows written before plays existed are still valid creative briefs.
 */
export function isCreativeBrief(b: unknown): b is CreativeBrief {
  return typeof b === 'object' && b !== null && 'hook' in b && 'headline' in b && 'callToAction' in b
}
