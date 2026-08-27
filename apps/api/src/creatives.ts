import {
  applyBrandGuidelines,
  applyBrandGuidelinesToStrings,
  appendDisclaimer,
  generateAdCopyVariants,
  generateRsaDescriptions,
  generateRsaHeadlines,
  generateUGCScript,
  type AdCopyVariant,
  type BrandGuidelines,
  type UGCDuration,
  type UGCScript,
} from '@growthos/logic'
import { getBrandGuidelines } from './brand.js'
import { assertWithinLimit, getRemainingAllowance, recordUsage } from './plan-limits.js'

/**
 * Server-side creative generation (M4 · P4.2a-4).
 *
 * WHY THIS EXISTS AT ALL. These generators used to run only in the browser: `AdCopyStudio.tsx` and
 * `RsaGenerator.tsx` imported `@growthos/logic` and called them in a click handler. That made
 * `aiCreativesPerMonth` a plan limit that could not bind — generation was free, unlimited client
 * computation on every plan, while Billing sold it as a metered entitlement. A limit enforced only
 * in the browser is not a limit.
 *
 * Moving it here does two things at once: the quota becomes real, and brand guidelines become
 * applicable, since a client-side generator cannot be constrained by a server-held record.
 *
 * WHAT COUNTS AS ONE CREATIVE. The unit metered is a **delivered** creative — a copy variant, a
 * script, a headline, a description — counted AFTER guideline filtering. Charging a workspace for
 * variants its own banned-terms list caused us to drop would be billing them for our filter.
 */

/** Ad copy is the widest generator; a request cannot ask for an unbounded batch to drain its quota in one call. */
const MAX_COUNT = 25

export type CreativeKind = 'ad-copy' | 'ugc-script' | 'rsa'

export interface GenerateAdCopyRequest {
  kind: 'ad-copy'
  product: string
  benefit: string
  painPoint: string
  count?: number | undefined
}

export interface GenerateUgcScriptRequest {
  kind: 'ugc-script'
  product: string
  duration?: UGCDuration | undefined
}

export interface GenerateRsaRequest {
  kind: 'rsa'
  keyword: string
  audience?: string | undefined
}

export type GenerateCreativeRequest =
  | GenerateAdCopyRequest
  | GenerateUgcScriptRequest
  | GenerateRsaRequest

export interface GenerateCreativeResult {
  kind: CreativeKind
  adCopy?: AdCopyVariant[]
  script?: UGCScript
  headlines?: string[]
  descriptions?: string[]
  /**
   * What the guidelines removed, and why. Surfaced rather than swallowed: a user who asked for five
   * variants and got three is owed the reason, and "your banned-terms list matched" is actionable
   * in a way that a silently shorter list is not.
   */
  dropped: { text: string; reason: string; detail: string }[]
  /** Delivered creatives charged against the quota by this call. */
  generated: number
  /** Remaining monthly allowance after this call; null when the plan is unlimited. */
  remaining: number | null
}

/** RSA field caps, enforced by the platform. Disclaimers must fit inside them or be skipped. */
const RSA_HEADLINE_MAX = 30
const RSA_DESCRIPTION_MAX = 90

function clampCount(count: number | undefined, fallback: number): number {
  if (count == null || !Number.isFinite(count)) return fallback
  return Math.max(1, Math.min(MAX_COUNT, Math.floor(count)))
}

/**
 * Appends a required disclaimer to each string, skipping any that cannot fit the field's cap.
 *
 * Applied only to the plain-string generators. Ad copy and scripts carry their disclaimer on the
 * body rather than every field, so bolting one onto a three-word CTA would read as broken.
 */
function withDisclaimers(values: string[], guidelines: BrandGuidelines | null, maxLength: number): string[] {
  if (!guidelines || guidelines.requiredDisclaimers.length === 0) return values
  return values.map((v) => appendDisclaimer(v, guidelines.requiredDisclaimers, maxLength).text)
}

/**
 * Generates, constrains and meters in one place.
 *
 * Order matters and is the same shape `recommendations.ts` uses: check the ceiling BEFORE doing the
 * work (`assertWithinLimit` → 402), then record only what was actually delivered.
 */
export async function generateCreatives(
  workspaceId: string,
  request: GenerateCreativeRequest,
): Promise<GenerateCreativeResult> {
  await assertWithinLimit(workspaceId, 'ai_creatives_generated')

  const guidelines = await getBrandGuidelines(workspaceId)
  const dropped: GenerateCreativeResult['dropped'] = []
  const result: GenerateCreativeResult = {
    kind: request.kind,
    dropped,
    generated: 0,
    remaining: null,
  }

  if (request.kind === 'ad-copy') {
    const variants = generateAdCopyVariants(
      request.product,
      request.benefit,
      request.painPoint,
      clampCount(request.count, 5),
    )
    const filtered = applyBrandGuidelines(variants, guidelines, (v) => [v.hook, v.body, v.cta])
    for (const d of filtered.dropped) {
      dropped.push({ text: d.item.hook, reason: d.reason, detail: d.detail })
    }
    result.adCopy = filtered.kept
    result.generated = filtered.kept.length
  } else if (request.kind === 'ugc-script') {
    const script = generateUGCScript(request.product, request.duration ?? 30)
    // A script is one indivisible creative: filtering it means keeping or rejecting the whole thing.
    const filtered = applyBrandGuidelines([script], guidelines, (s) => [
      s.hook,
      s.demo,
      s.testimonial,
      s.cta,
    ])
    for (const d of filtered.dropped) {
      dropped.push({ text: d.item.hook, reason: d.reason, detail: d.detail })
    }
    if (filtered.kept[0]) {
      result.script = filtered.kept[0]
      result.generated = 1
    }
  } else {
    const headlines = applyBrandGuidelinesToStrings(
      generateRsaHeadlines(request.keyword, request.audience?.trim() || 'Professionals'),
      guidelines,
    )
    const descriptions = applyBrandGuidelinesToStrings(
      generateRsaDescriptions(request.keyword),
      guidelines,
    )
    for (const d of [...headlines.dropped, ...descriptions.dropped]) {
      dropped.push({ text: d.item, reason: d.reason, detail: d.detail })
    }
    result.headlines = withDisclaimers(headlines.kept, guidelines, RSA_HEADLINE_MAX)
    result.descriptions = withDisclaimers(descriptions.kept, guidelines, RSA_DESCRIPTION_MAX)
    result.generated = headlines.kept.length + descriptions.kept.length
  }

  // Only a delivered creative is charged. A request whose every variant was filtered out costs
  // nothing — the workspace received nothing.
  if (result.generated > 0) {
    await recordUsage(workspaceId, 'ai_creatives_generated', result.generated)
  }

  const remaining = await getRemainingAllowance(workspaceId, 'ai_creatives_generated')
  result.remaining = remaining === Infinity ? null : remaining

  return result
}
