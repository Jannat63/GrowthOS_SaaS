// Google Ads advisor — deterministic, no-LLM (D4). Ported from legacy
// google-ads-service/app/features.py: wasted-spend detection, campaign classification, and RSA
// (Responsive Search Ad) copy generation via combinatorial templating.

export interface CampaignInput {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
  cost: number; // spend
  conversionValue: number;
  qualityScore?: number; // 1–10; defaults to 10 when unknown
}

export type CampaignStatus = "wasted" | "scale" | "healthy";

export interface CampaignInsight extends CampaignInput {
  cpa: number; // cost per acquisition (0 when no conversions)
  roas: number; // return on ad spend
  conversionRate: number;
  status: CampaignStatus;
  recommendation: string;
}

export interface WastedSpendFinding {
  campaign: string;
  issue: string;
  wastedSpend: number;
  severity: "High" | "Medium";
}

export interface CampaignSummary {
  totalSpend: number;
  totalConversions: number;
  blendedCpa: number;
  blendedRoas: number;
  wastedCount: number;
  scaleCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Per-campaign efficiency metrics + a status classification and a plain-English recommendation. */
export function analyzeCampaigns(campaigns: CampaignInput[]): CampaignInsight[] {
  return campaigns.map((c) => {
    const conversionRate = c.clicks > 0 ? c.conversions / c.clicks : 0;
    const cpa = c.conversions > 0 ? round2(c.cost / c.conversions) : 0;
    const roas = c.cost > 0 ? round2(c.conversionValue / c.cost) : 0;

    let status: CampaignStatus;
    let recommendation: string;
    if ((c.clicks > 50 && c.conversions === 0) || (roas > 0 && roas < 1)) {
      status = "wasted";
      recommendation =
        c.conversions === 0
          ? "No conversions despite meaningful clicks — pause or rework targeting/landing page."
          : "Spending more than it returns (ROAS < 1) — cut bids or pause.";
    } else if (roas >= 3) {
      status = "scale";
      recommendation = "Strong ROAS — increase budget to capture more of this demand.";
    } else {
      status = "healthy";
      recommendation = "Performing within range — monitor and optimize incrementally.";
    }

    return { ...c, cpa, roas, conversionRate: round2(conversionRate), status, recommendation };
  });
}

/**
 * Flags campaigns burning budget without converting, or with a low Quality Score inflating CPC.
 * Ported from the legacy Wasted Spend Detector.
 */
export function detectWastedSpend(campaigns: CampaignInput[]): WastedSpendFinding[] {
  const findings: WastedSpendFinding[] = [];
  for (const c of campaigns) {
    const conversionRate = c.clicks > 0 ? c.conversions / c.clicks : 0;
    const costPerClick = c.clicks > 0 ? c.cost / c.clicks : 0;
    const qualityScore = c.qualityScore ?? 10;

    if (c.clicks > 50 && c.conversions === 0) {
      findings.push({
        campaign: c.name,
        issue: "Zero conversions despite significant clicks",
        wastedSpend: round2(c.cost),
        severity: "High",
      });
    } else if (conversionRate < 0.005 && c.cost > 100) {
      findings.push({
        campaign: c.name,
        issue: `Very low conversion rate (${(conversionRate * 100).toFixed(2)}%)`,
        wastedSpend: round2(c.cost * 0.5),
        severity: "Medium",
      });
    }

    if (qualityScore <= 3) {
      findings.push({
        campaign: c.name,
        issue: `Low Quality Score (${qualityScore}/10) inflating CPC`,
        wastedSpend: round2(costPerClick * c.clicks * 0.3),
        severity: "Medium",
      });
    }
  }
  return findings;
}

export function summarizeCampaigns(insights: CampaignInsight[]): CampaignSummary {
  const totalSpend = round2(insights.reduce((s, c) => s + c.cost, 0));
  const totalConversions = insights.reduce((s, c) => s + c.conversions, 0);
  const totalValue = insights.reduce((s, c) => s + c.conversionValue, 0);
  return {
    totalSpend,
    totalConversions,
    blendedCpa: totalConversions > 0 ? round2(totalSpend / totalConversions) : 0,
    blendedRoas: totalSpend > 0 ? round2(totalValue / totalSpend) : 0,
    wastedCount: insights.filter((c) => c.status === "wasted").length,
    scaleCount: insights.filter((c) => c.status === "scale").length,
  };
}

// ── RSA copy generator (combinatorial templating — no LLM) ────────────────────────────────────

const HEADLINE_TEMPLATES = [
  "{keyword} — Shop Now",
  "Premium {keyword}",
  "{keyword} | Free Shipping",
  "Top-Rated {keyword}",
  "{keyword} Starting at Great Prices",
  "Shop {keyword} Today",
  "{keyword} — 30-Day Returns",
  "Best {keyword} for {audience}",
  "{keyword}: Built to Last",
  "Get Your {keyword} Now",
  "{keyword} — Highly Rated",
  "Discover {keyword}",
  "{keyword} Sale — Limited Time",
  "Why Choose Our {keyword}?",
  "{keyword} Made Simple",
];

const DESCRIPTION_TEMPLATES = [
  "Shop our full range of {keyword} with fast, free shipping on every order.",
  "Find the perfect {keyword} for your needs. Compare options and save today.",
  "Trusted by thousands. Explore {keyword} backed by our satisfaction guarantee.",
  "Quality {keyword} at prices that make sense. Order now and save.",
];

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Google Ads RSA headlines (≤30 chars, the platform limit). Templates that overflow are dropped. */
export function generateRsaHeadlines(
  keyword: string,
  audience = "Professionals",
  count = 15,
): string[] {
  return HEADLINE_TEMPLATES.slice(0, count)
    .map((t) => t.replace("{keyword}", titleCase(keyword)).replace("{audience}", audience))
    .filter((h) => h.length <= 30);
}

/** Google Ads RSA descriptions (≤90 chars, the platform limit). */
export function generateRsaDescriptions(keyword: string, count = 4): string[] {
  return DESCRIPTION_TEMPLATES.slice(0, count)
    .map((t) => t.replace("{keyword}", keyword))
    .filter((d) => d.length <= 90);
}
