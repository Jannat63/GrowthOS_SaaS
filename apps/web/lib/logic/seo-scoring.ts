// Real logic implementing Section 7.2.1 of the blueprint:
// "ranked by a composite opportunity score combining: search volume,
//  keyword difficulty, competitor gap, paid conversion proof, and GEO citation potential."

export interface KeywordInput {
  keyword: string;
  volume: number; // monthly search volume
  difficulty: number; // 0-100, higher = harder
  currentPosition: number | null; // null = not ranking
  competitorGapCount: number; // # of top-10 competitors ranking where user is not
  paidProvenConversions: number; // conversions this exact term generated in Google Ads
  geoCitationPotential: number; // 0-100 estimated AI-citation opportunity
}

export interface ScoredKeyword extends KeywordInput {
  opportunityScore: number;
  label: "Paid-Proven, Organic Needed" | "High Priority" | "Standard" | "Low Priority";
}

const WEIGHTS = {
  volume: 0.3,
  difficulty: 0.2, // inverted — lower difficulty is better
  competitorGap: 0.2,
  paidProof: 0.2,
  geoCitation: 0.1,
};

function normalize(value: number, max: number) {
  return Math.min(value / max, 1) * 100;
}

export function scoreKeyword(k: KeywordInput): ScoredKeyword {
  const volumeScore = normalize(k.volume, 20000);
  const difficultyScore = 100 - k.difficulty; // invert: easier = higher score
  const gapScore = normalize(k.competitorGapCount, 10);
  const paidProofScore = normalize(k.paidProvenConversions, 50);
  const geoScore = k.geoCitationPotential;

  const opportunityScore = Math.round(
    volumeScore * WEIGHTS.volume +
      difficultyScore * WEIGHTS.difficulty +
      gapScore * WEIGHTS.competitorGap +
      paidProofScore * WEIGHTS.paidProof +
      geoScore * WEIGHTS.geoCitation
  );

  // Paid-to-Organic Bridge rule (Section 7.3.2): converted via Google Ads AND no/low organic coverage
  let label: ScoredKeyword["label"] = "Standard";
  if (k.paidProvenConversions > 0 && (k.currentPosition === null || k.currentPosition > 10)) {
    label = "Paid-Proven, Organic Needed";
  } else if (opportunityScore >= 70) {
    label = "High Priority";
  } else if (opportunityScore < 40) {
    label = "Low Priority";
  }

  return { ...k, opportunityScore, label };
}

export function scoreKeywords(keywords: KeywordInput[]): ScoredKeyword[] {
  return keywords.map(scoreKeyword).sort((a, b) => b.opportunityScore - a.opportunityScore);
}
