// Meta Ads advisor — deterministic, no-LLM (D4). Ported from legacy meta-ads-service/src/features.ts:
// full-funnel budget split (TOFU/MOFU/BOFU), ad-copy variants, and UGC video scripts via templating.

export type AccountMaturity = "new" | "established";

export interface FunnelBudgetSplit {
  tofu: number;
  mofu: number;
  bofu: number;
}

/**
 * Full-funnel budget split (blueprint §7.4.1). New accounts weight cold prospecting (TOFU); established
 * accounts shift toward retargeting once a warm/hot pool exists.
 */
export function calculateFunnelBudgetSplit(
  totalBudget: number,
  accountMaturity: AccountMaturity = "new",
): FunnelBudgetSplit {
  const ratios =
    accountMaturity === "new"
      ? { tofu: 0.5, mofu: 0.3, bofu: 0.2 }
      : { tofu: 0.35, mofu: 0.35, bofu: 0.3 };
  return {
    tofu: Math.round(totalBudget * ratios.tofu),
    mofu: Math.round(totalBudget * ratios.mofu),
    bofu: Math.round(totalBudget * ratios.bofu),
  };
}

/**
 * How well the audience already knows you — the thing Meta is actually bought by.
 *
 * A separate field rather than a prefix on `audience`. It used to be smuggled into that string as
 * "Cold — Interest-based targeting for X", which meant the only way to show the temperature on its
 * own was to split the sentence back apart in the view, and the only way to show the targeting
 * without it was not to. TOFU/MOFU/BOFU is trade jargon; cold/warm/hot is what it means.
 */
export type AudienceTemperature = "Cold" | "Warm" | "Hot";

export interface FunnelStage {
  stage: "TOFU" | "MOFU" | "BOFU";
  temperature: AudienceTemperature;
  budget: number;
  /** Who to target — the targeting spec alone, with no temperature prefix. */
  audience: string;
  objective: string;
}

export function buildFullFunnelPlan(
  totalBudget: number,
  productName: string,
  accountMaturity: AccountMaturity = "new",
): FunnelStage[] {
  const split = calculateFunnelBudgetSplit(totalBudget, accountMaturity);
  return [
    {
      stage: "TOFU",
      temperature: "Cold",
      budget: split.tofu,
      audience: `Interest-based targeting for ${productName}`,
      objective: "Awareness / Reach",
    },
    {
      stage: "MOFU",
      temperature: "Warm",
      budget: split.mofu,
      audience: "Website visitors, video viewers",
      objective: "Traffic / Engagement",
    },
    {
      stage: "BOFU",
      temperature: "Hot",
      budget: split.bofu,
      audience: "Cart abandoners, add-to-cart",
      objective: "Conversions",
    },
  ];
}

// ── Ad copy writer (hook / body / CTA templating) ─────────────────────────────────────────────

const HOOKS = [
  "Tired of {painPoint}?",
  // `{aProduct}`, not `a {product}` — see `article()`.
  "Finally, {aProduct} that actually works.",
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

/**
 * Words whose leading vowel is pronounced "y" — they take "a", not "an".
 *
 * The template used to read `a {product}`, which shipped "Finally, a Ergonomic Office Chair that
 * actually works." to screen. The rule is about the initial SOUND, so neither the spelling nor a
 * blanket vowel test gets it right on its own: "an ergonomic chair" but "a unique chair".
 *
 * This is a heuristic and it knows it — it will say "a hour". It is applied only to templated ad
 * copy, where the alternative on the page was plainly broken English, and never to anything a
 * customer's own text passes through.
 */
const SOUNDS_LIKE_Y = /^(uni|use|ubiq|utili|usual|eu|one)/i;

function article(noun: string): "a" | "an" {
  const first = noun.trim();
  if (SOUNDS_LIKE_Y.test(first)) return "a";
  return /^[aeiou]/i.test(first) ? "an" : "a";
}

const fill = (template: string, product: string, benefit: string, painPoint: string) =>
  template
    .replaceAll("{aProduct}", `${article(product)} ${product}`)
    .replaceAll("{product}", product)
    .replaceAll("{benefit}", benefit)
    .replaceAll("{painPoint}", painPoint);

export function generateAdCopyVariants(
  product: string,
  benefit: string,
  painPoint: string,
  count = 5,
): AdCopyVariant[] {
  return HOOKS.slice(0, Math.min(count, HOOKS.length)).map((hook, i) => ({
    hook: fill(hook, product, benefit, painPoint),
    body: fill(BODIES[i % BODIES.length]!, product, benefit, painPoint),
    cta: CTAS[i % CTAS.length]!,
  }));
}

// ── UGC-style video script writer ─────────────────────────────────────────────────────────────

export type UGCDuration = 15 | 30 | 60;

export interface UGCScript {
  durationSeconds: UGCDuration;
  hook: string;
  demo: string;
  testimonial: string;
  cta: string;
}

export function generateUGCScript(product: string, duration: UGCDuration = 30): UGCScript {
  const scripts: Record<UGCDuration, UGCScript> = {
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
