// Real logic implementing Section 7.4.3 / 5.1.6:
// "Blended MER Calculation: (Total Revenue) / (Total Ad Spend across Meta + Google).
//  Immune to platform attribution bias."

export interface MERInput {
  totalRevenue: number;
  googleAdsSpend: number;
  metaAdsSpend: number;
}

export interface MERResult {
  blendedMER: number;
  totalSpend: number;
  interpretation: string;
}

export function calculateBlendedMER({ totalRevenue, googleAdsSpend, metaAdsSpend }: MERInput): MERResult {
  const totalSpend = googleAdsSpend + metaAdsSpend;
  const blendedMER = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  let interpretation = "Efficiency is unclear — insufficient spend data.";
  if (blendedMER >= 4) interpretation = "Excellent efficiency — well above healthy benchmark of 3x.";
  else if (blendedMER >= 2) interpretation = "Healthy efficiency — within normal profitable range.";
  else if (blendedMER > 0) interpretation = "Below target — review channel spend allocation.";

  return { blendedMER: Math.round(blendedMER * 100) / 100, totalSpend, interpretation };
}
