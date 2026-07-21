/**
 * Meta Ads features without an LLM — Section 4.3.
 * Full-Funnel Builder and Budget Split are real math from the blueprint's
 * own recommended ratios (Section 7.4.1). Ad Copy Writer and UGC Script
 * Writer use combinatorial templating — real, deterministic, no paid API.
 */

// ---- Full-Funnel Campaign Builder + Budget Split Calculator (Section 4.3.3) ----
export interface FunnelBudgetSplit {
  tofu: number;
  mofu: number;
  bofu: number;
}

export function calculateFunnelBudgetSplit(totalBudget: number, accountMaturity: "new" | "established" = "new"): FunnelBudgetSplit {
  // Section 7.4.1: "TOFU campaign (cold audiences at 50% of budget), MOFU
  // retargeting (warm audiences at 30%), BOFU conversion campaign (hot
  // retargeting at 20%)" — adjusted for established accounts with more
  // retargeting pool built up.
  const ratios = accountMaturity === "new" ? { tofu: 0.5, mofu: 0.3, bofu: 0.2 } : { tofu: 0.35, mofu: 0.35, bofu: 0.3 };
  return {
    tofu: Math.round(totalBudget * ratios.tofu),
    mofu: Math.round(totalBudget * ratios.mofu),
    bofu: Math.round(totalBudget * ratios.bofu),
  };
}

export interface FunnelStage {
  stage: "TOFU" | "MOFU" | "BOFU";
  budget: number;
  audience: string;
  objective: string;
}

export function buildFullFunnelPlan(totalBudget: number, productName: string): FunnelStage[] {
  const split = calculateFunnelBudgetSplit(totalBudget);
  return [
    { stage: "TOFU", budget: split.tofu, audience: `Cold — Interest-based targeting for ${productName}`, objective: "Awareness / Reach" },
    { stage: "MOFU", budget: split.mofu, audience: "Warm — Website visitors, video viewers", objective: "Traffic / Engagement" },
    { stage: "BOFU", budget: split.bofu, audience: "Hot — Cart abandoners, add-to-cart", objective: "Conversions" },
  ];
}

// ---- Ad Copy Writer (Section 4.3.2) — hook/body/CTA templates ----
const HOOKS = [
  "Tired of {painPoint}?",
  "Finally, a {product} that actually works.",
  "This {product} changed everything.",
  "Stop settling for less.",
  "The secret to {benefit} isn't what you think.",
];

const BODIES = [
  "Our {product} is designed for people who want {benefit} without compromise.",
  "Join thousands who've already made the switch to {product}.",
  "Backed by a 30-day guarantee — try {product} risk-free.",
];

const CTAS = ["Shop Now", "Learn More", "Get Yours Today", "See the Difference"];

export interface AdCopyVariant {
  hook: string;
  body: string;
  cta: string;
}

export function generateAdCopyVariants(product: string, benefit: string, painPoint: string, count: number = 5): AdCopyVariant[] {
  const variants: AdCopyVariant[] = [];
  for (let i = 0; i < Math.min(count, HOOKS.length); i++) {
    variants.push({
      hook: HOOKS[i].replace("{product}", product).replace("{benefit}", benefit).replace("{painPoint}", painPoint),
      body: BODIES[i % BODIES.length].replace("{product}", product).replace("{benefit}", benefit),
      cta: CTAS[i % CTAS.length],
    });
  }
  return variants;
}

// ---- UGC-Style Video Script Writer (Section 4.3.2) ----
export interface UGCScript {
  durationSeconds: 15 | 30 | 60;
  hook: string;
  demo: string;
  testimonial: string;
  cta: string;
}

export function generateUGCScript(product: string, duration: 15 | 30 | 60 = 30): UGCScript {
  const scripts: Record<number, UGCScript> = {
    15: {
      durationSeconds: 15,
      hook: `"I was skeptical about ${product} until..."`,
      demo: `[Quick 5-second demo of ${product} in use]`,
      testimonial: `"Honestly, best purchase this year."`,
      cta: `Link in bio to get yours.`,
    },
    30: {
      durationSeconds: 30,
      hook: `"Let me show you why everyone's talking about ${product}."`,
      demo: `[10-second demo showing ${product} solving a real problem]`,
      testimonial: `"I've tried everything else, nothing compares."`,
      cta: `Tap the link below — you won't regret it.`,
    },
    60: {
      durationSeconds: 60,
      hook: `"Here's my honest review of ${product} after 30 days."`,
      demo: `[20-second demo + before/after comparison]`,
      testimonial: `"My only regret is not buying it sooner."`,
      cta: `Full review and link in the description.`,
    },
  };
  return scripts[duration];
}
