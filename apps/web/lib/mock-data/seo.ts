import type { KeywordInput } from "@/lib/logic/seo-scoring";

/** Ported from legacy — the raw keyword set the seo-scoring engine consumes. */
export const rawKeywords: KeywordInput[] = [
  { keyword: "office chair", volume: 18000, difficulty: 62, currentPosition: 6, competitorGapCount: 3, paidProvenConversions: 42, geoCitationPotential: 40 },
  { keyword: "ergonomic chair", volume: 9500, difficulty: 55, currentPosition: 9, competitorGapCount: 4, paidProvenConversions: 31, geoCitationPotential: 55 },
  { keyword: "best office chair 2026", volume: 4200, difficulty: 38, currentPosition: null, competitorGapCount: 7, paidProvenConversions: 18, geoCitationPotential: 70 },
  { keyword: "mesh office chair", volume: 3100, difficulty: 44, currentPosition: 14, competitorGapCount: 5, paidProvenConversions: 9, geoCitationPotential: 35 },
  { keyword: "gaming chair", volume: 22000, difficulty: 78, currentPosition: 21, competitorGapCount: 2, paidProvenConversions: 5, geoCitationPotential: 20 },
  { keyword: "modern dining table", volume: 6800, difficulty: 41, currentPosition: null, competitorGapCount: 8, paidProvenConversions: 0, geoCitationPotential: 60 },
  { keyword: "sofa collection", volume: 5100, difficulty: 33, currentPosition: 3, competitorGapCount: 1, paidProvenConversions: 12, geoCitationPotential: 25 },
];
