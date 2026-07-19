import { compositeScore, type MappedRecommendation } from "./recommendation.js";
import type { ScoredKeyword } from "./engines/seo-scoring.js";

export interface CreativeBrief {
  hook: string;
  primaryText: string;
  headline: string;
  format: string;
  audience: string;
  callToAction: string;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Deterministic Meta creative brief template (D4 — Claude behind a flag later).
export function generateCreativeBrief(topic: string): CreativeBrief {
  const t = topic.trim();
  const title = titleCase(t);
  return {
    hook: `Still searching for the right ${t}?`,
    primaryText: `Thousands find their ${t} through us. Here's what makes the difference — and why it matters for you.`,
    headline: `${title} — Made Simple`,
    format: "Single image / short-form video",
    audience: `Cold — interest-based lookalikes around "${t}"`,
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
