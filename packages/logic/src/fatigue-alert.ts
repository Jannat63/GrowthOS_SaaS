import { compositeScore, type MappedRecommendation } from "./recommendation.js";
import type { FatigueResult } from "./engines/creative-fatigue.js";

// Maps a fatiguing creative onto a fatigue_alert recommendation (refresh the creative).
export function fatigueAlertRecommendation(
  f: FatigueResult,
  workspaceId: string
): MappedRecommendation {
  const isFatigued = f.status === "fatigued";
  const impactScore = isFatigued ? 85 : 60;
  const effortScore = 35; // refreshing a creative is relatively low effort
  const urgencyScore = isFatigued ? 90 : 60;
  return {
    externalId: `fatigue:${f.name}`,
    workspaceId,
    type: "fatigue_alert",
    sourceChannel: "meta_ads",
    targetChannel: "meta_ads",
    title: `Refresh creative: "${f.name}"`,
    body: `${f.message} Suggested: test a fresh hook or rotate in a new format/angle.`,
    actionLabel: "Refresh creative",
    impactScore,
    effortScore,
    urgencyScore,
    compositeScore: compositeScore(impactScore, urgencyScore, effortScore),
    status: "pending",
    rawData: f,
  };
}
