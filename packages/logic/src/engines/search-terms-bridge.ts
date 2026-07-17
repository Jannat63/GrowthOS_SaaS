// Real logic implementing Section 7.3.2:
// "Search terms that meet two criteria — converted via Google Ads AND have no SEO
//  content coverage — are automatically sent... as high-priority SEO content opportunities."
// "Search terms that convert well but are already covered organically with a
//  top-3 ranking trigger: 'Consider reducing bid on this term.'"

export interface SearchTerm {
  term: string;
  clicks: number;
  conversions: number;
  cost: number;
  organicPosition: number | null; // null = no organic coverage at all
}

export type BridgeRecommendation =
  | { type: "paid-proven-organic-needed"; message: string }
  | { type: "reduce-bid-organic-covers"; message: string }
  | { type: "monitor"; message: string };

export interface AnalyzedSearchTerm extends SearchTerm {
  conversionRate: number;
  recommendation: BridgeRecommendation;
}

export function analyzeSearchTerm(t: SearchTerm): AnalyzedSearchTerm {
  const conversionRate = t.clicks > 0 ? t.conversions / t.clicks : 0;
  const hasNoOrganicCoverage = t.organicPosition === null || t.organicPosition > 10;
  const hasTop3Organic = t.organicPosition !== null && t.organicPosition <= 3;

  let recommendation: BridgeRecommendation;

  if (t.conversions > 0 && hasNoOrganicCoverage) {
    recommendation = {
      type: "paid-proven-organic-needed",
      message: `"${t.term}" converted ${t.conversions}x via paid but has no ranking SEO content — priority content brief created.`,
    };
  } else if (t.conversions > 0 && hasTop3Organic) {
    recommendation = {
      type: "reduce-bid-organic-covers",
      message: `You already rank #${t.organicPosition} organically for "${t.term}". Consider reducing bid and reallocating budget.`,
    };
  } else {
    recommendation = { type: "monitor", message: `"${t.term}" — no action needed yet.` };
  }

  return { ...t, conversionRate, recommendation };
}

export function analyzeSearchTerms(terms: SearchTerm[]): AnalyzedSearchTerm[] {
  return terms.map(analyzeSearchTerm).sort((a, b) => b.conversions - a.conversions);
}
