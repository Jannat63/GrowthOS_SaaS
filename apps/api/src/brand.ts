import { eq } from 'drizzle-orm'
import { db, schema } from '@growthos/db'
import { BRAND_TONES, type BrandGuidelines, type BrandTone } from '@growthos/logic'

/**
 * Brand guidelines persistence (M4 · P4.2a-1).
 *
 * The engine that consumes this lives in `@growthos/logic` (`brand-guidelines.ts`) and is pure; this
 * module is only the storage edge. One row per workspace, enforced by a unique constraint on
 * `workspace_id`.
 *
 * DELIBERATELY NOT PLAN-GATED. Guidelines are configuration that costs nothing to store and only
 * improves generator output; gating them would mean a workspace on a lower plan generates *worse*
 * copy rather than *less* of it. The plan limit that matters (`ai_creatives_generated`) belongs at
 * the generation endpoint — see P4.2a-4.
 */

/** Field-level caps. Unbounded text[] columns are a storage-exhaustion vector on a shared database. */
const MAX_TERMS = 100
const MAX_TERM_LENGTH = 120

// `| undefined` is explicit on every member: this package runs `exactOptionalPropertyTypes`, under
// which `tone?: string` means "absent, or a string" and rejects an explicit `undefined` — which is
// exactly what a zod `.optional()` produces for a field the client omitted.
export interface BrandGuidelinesInput {
  tone?: string | undefined
  bannedTerms?: string[] | undefined
  requiredDisclaimers?: string[] | undefined
  valueProps?: string[] | undefined
  targetPersona?: string | null | undefined
  readingLevel?: number | null | undefined
}

export function isBrandTone(value: string): value is BrandTone {
  return (BRAND_TONES as readonly string[]).includes(value)
}

/**
 * Trims, drops blanks, caps length and de-duplicates case-insensitively.
 *
 * Blank entries matter beyond tidiness: an empty banned term compiles to a regex matching every
 * string, so one stray blank row in the settings UI would drop every generated variant. The engine
 * guards this too — both ends, because either alone is one refactor from being the only one.
 */
function normalizeTerms(values: string[] | undefined): string[] {
  if (!values) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const value = raw.trim().slice(0, MAX_TERM_LENGTH)
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
    if (out.length >= MAX_TERMS) break
  }
  return out
}

/**
 * The workspace's guidelines, or **null when none are configured**.
 *
 * Null rather than a defaulted object on purpose: `applyBrandGuidelines` reads null as "keep
 * everything unchanged", so an unconfigured workspace gets exactly the generator output it has
 * always got. A defaulted object would make "no guidelines" and "empty guidelines" indistinguishable
 * to the engine.
 */
export async function getBrandGuidelines(workspaceId: string): Promise<BrandGuidelines | null> {
  const [row] = await db
    .select()
    .from(schema.brandGuidelines)
    .where(eq(schema.brandGuidelines.workspaceId, workspaceId))

  if (!row) return null

  return {
    // `tone` is stored as text (no pgEnum in this schema); a row written before a tone was retired
    // falls back rather than propagating an invalid union member into the engine.
    tone: isBrandTone(row.tone) ? row.tone : 'professional',
    bannedTerms: row.bannedTerms,
    requiredDisclaimers: row.requiredDisclaimers,
    valueProps: row.valueProps,
    targetPersona: row.targetPersona,
    readingLevel: row.readingLevel,
  }
}

/** Shape the settings UI renders: real values when set, documented defaults when not. */
export async function getBrandGuidelinesForDisplay(workspaceId: string): Promise<
  BrandGuidelines & { configured: boolean }
> {
  const existing = await getBrandGuidelines(workspaceId)
  if (existing) return { ...existing, configured: true }
  return {
    tone: 'professional',
    bannedTerms: [],
    requiredDisclaimers: [],
    valueProps: [],
    targetPersona: null,
    readingLevel: null,
    configured: false,
  }
}

/**
 * Creates or replaces the workspace's guidelines.
 *
 * `onConflictDoUpdate` on the unique `workspace_id` rather than select-then-insert: two admins
 * saving the settings form at the same moment would otherwise race between the check and the write,
 * and the loser hits a constraint violation surfacing as a 500.
 */
export async function upsertBrandGuidelines(
  workspaceId: string,
  input: BrandGuidelinesInput,
): Promise<BrandGuidelines> {
  const values = {
    workspaceId,
    tone: input.tone && isBrandTone(input.tone) ? input.tone : 'professional',
    bannedTerms: normalizeTerms(input.bannedTerms),
    requiredDisclaimers: normalizeTerms(input.requiredDisclaimers),
    valueProps: normalizeTerms(input.valueProps),
    targetPersona: input.targetPersona?.trim() || null,
    readingLevel: input.readingLevel ?? null,
  }

  await db
    .insert(schema.brandGuidelines)
    .values(values)
    .onConflictDoUpdate({
      target: schema.brandGuidelines.workspaceId,
      set: { ...values, updatedAt: new Date() },
    })

  return {
    tone: values.tone as BrandTone,
    bannedTerms: values.bannedTerms,
    requiredDisclaimers: values.requiredDisclaimers,
    valueProps: values.valueProps,
    targetPersona: values.targetPersona,
    readingLevel: values.readingLevel,
  }
}
