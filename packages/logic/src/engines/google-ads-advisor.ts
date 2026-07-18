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
    const rawRoas = c.cost > 0 ? c.conversionValue / c.cost : 0; // classify on the raw ratio, not rounded
    const roas = round2(rawRoas);

    // "Wasted" = spent money and returned less than it cost (covers zero-conversion-with-spend and any
    // sub-1 ROAS, regardless of rounding), or burned meaningful clicks with nothing to show. Classifying
    // on rounded ROAS previously let a $500→$2 campaign round to 0 and slip into "healthy".
    const spentAndLosing = c.cost > 0 && c.conversionValue < c.cost;
    let status: CampaignStatus;
    let recommendation: string;
    if (spentAndLosing || (c.clicks > 50 && c.conversions === 0)) {
      status = "wasted";
      recommendation =
        c.conversions === 0
          ? "No conversions despite the spend — pause or rework targeting/landing page."
          : "Spending more than it returns (ROAS < 1) — cut bids or pause.";
    } else if (rawRoas >= 3) {
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

// ── Target CPA / ROAS + budget allocator (unit economics — no LLM) ────────────────────────────

/**
 * Breakeven CPA is the full product margin; the target CPA leaves room for the desired profit
 * margin. Ported from the legacy Target CPA/ROAS Calculator.
 */
export function calculateTargetCpa(productMargin: number, targetProfitMarginPct = 20): number {
  return round2(productMargin * (1 - targetProfitMarginPct / 100));
}

/**
 * Minimum ROAS to break even: at break-even you can spend your whole per-sale margin on ads, so
 * ROAS = price / margin = price / (price − cogs). (The legacy formula used price/cogs, which is the
 * markup ratio, not break-even ROAS.)
 */
export function calculateMinimumRoas(productPrice: number, costOfGoods: number): number {
  const margin = productPrice - costOfGoods;
  if (margin <= 0) return 0;
  return round2(productPrice / margin);
}

export type BusinessStage = "new" | "growth" | "scale";

export interface BudgetAllocationRow {
  channel: string;
  pct: number; // 0–1
  amount: number;
}

const BUDGET_SPLITS: Record<BusinessStage, Record<string, number>> = {
  new: { search: 0.6, pmax: 0.2, display: 0.1, demand_gen: 0.1 },
  growth: { search: 0.45, pmax: 0.35, display: 0.1, demand_gen: 0.1 },
  scale: { search: 0.35, pmax: 0.4, display: 0.15, demand_gen: 0.1 },
};

/** Recommends a budget split across campaign types based on funnel stage. */
export function allocateBudget(
  totalBudget: number,
  businessStage: BusinessStage = "growth",
): BudgetAllocationRow[] {
  const split = BUDGET_SPLITS[businessStage] ?? BUDGET_SPLITS.growth;
  return Object.entries(split).map(([channel, pct]) => ({
    channel,
    pct,
    amount: round2(totalBudget * pct),
  }));
}
