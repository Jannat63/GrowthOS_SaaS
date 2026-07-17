import type { CrossChannelRecommendation } from "./engines/cross-channel-engine.js";

export interface MappedRecommendation {
  externalId: string;
  workspaceId: string;
  type: string;
  sourceChannel: string;
  targetChannel: string;
  title: string;
  body: string;
  actionLabel: string | null;
  impactScore: number;
  effortScore: number;
  urgencyScore: number;
  compositeScore: number;
  status: "pending" | "acted" | "dismissed" | "snoozed";
  rawData: unknown;
}

// Blueprint composite: impact*0.5 + urgency*0.35 + (100-effort)*0.15.
export function compositeScore(impact: number, urgency: number, effort: number): number {
  return Math.round(impact * 0.5 + urgency * 0.35 + (100 - effort) * 0.15);
}

const IMPACT_SCORE = { High: 90, Medium: 60, Low: 30 } as const;
const BRIDGE_CHANNELS: Record<string, [string, string]> = {
  "SEO→GoogleAds": ["seo", "google_ads"],
  "GoogleAds→SEO": ["google_ads", "seo"],
  "Meta→SEO": ["meta_ads", "seo"],
  "SEO→Meta": ["seo", "meta_ads"],
};

// Maps a cross-channel engine rec onto the persisted Recommendation shape. Used by BOTH the API
// generator and the web mock fallback, so live and fallback agree. effort/urgency are synthesized
// deterministically (the engine only emits a High/Medium/Low impact) — seeded M2 behavior.
export function toRecommendation(
  r: CrossChannelRecommendation,
  workspaceId: string
): MappedRecommendation {
  const [sourceChannel, targetChannel] = BRIDGE_CHANNELS[r.bridge] ?? ["unified", "unified"];
  const impactScore = IMPACT_SCORE[r.impact];
  const effortScore = 40;
  const urgencyScore = r.impact === "High" ? 75 : r.impact === "Medium" ? 50 : 30;
  return {
    externalId: r.id,
    workspaceId,
    type: "cross_channel",
    sourceChannel,
    targetChannel,
    title: r.title,
    body: r.message,
    actionLabel: null,
    impactScore,
    effortScore,
    urgencyScore,
    compositeScore: compositeScore(impactScore, urgencyScore, effortScore),
    status: "pending",
    rawData: r,
  };
}
