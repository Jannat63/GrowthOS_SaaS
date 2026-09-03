// Brand guidelines (M4 · P4.2a-1) — turns the deterministic copy generators from templates into
// brand-constrained templates, with no new external dependency and no AI call (D4 intact).
//
// APPLIED AS A FILTER OVER GENERATOR OUTPUT, not as a parameter threaded through every generator:
//
//   generateAdCopyVariants(...) → applyBrandGuidelines(variants, guidelines, extract) → constrained
//
// That keeps each generator's signature unchanged, makes the constraint independently testable, and
// means one implementation covers every current and future generator.
//
// WHAT A FILTER CAN AND CANNOT ENFORCE. Of the six guideline fields, only three are filterable, and
// pretending otherwise would be the more dishonest design:
//
//   - `bannedTerms`        → FILTER. A violating variant is dropped, never rewritten: rewriting
//                            without a language model produces mangled copy, and a smaller set of
//                            clean variants beats a larger set of broken ones.
//   - `requiredDisclaimers`→ APPEND, within the channel's length budget.
//   - `readingLevel`       → FILTER, but only on copy long enough for the metric to mean anything
//                            (see `fleschKincaidGrade`).
//   - `valueProps`         → RANK, not filter. A variant that echoes a value prop is preferred, but
//                            dropping every variant that misses one would routinely empty the set.
//   - `tone`               → NOT ENFORCEABLE HERE. Tone is a property of which template was chosen,
//                            so honouring it means tone-keyed templates inside each generator. It
//                            is carried on the type so the P4.2a-4 endpoint can pass it through,
//                            and is deliberately inert until those templates exist.
//   - `targetPersona`      → NOT A FILTER CRITERION. It is already a generator *input*
//                            (`generateRsaHeadlines(keyword, audience)`), passed at call time.
//
// Nothing here silently discards: every drop is returned with the reason and the offending term, so
// a caller can tell a user why they got three variants instead of five.

export type BrandTone = "professional" | "friendly" | "bold" | "technical" | "playful";

export const BRAND_TONES: readonly BrandTone[] = [
  "professional",
  "friendly",
  "bold",
  "technical",
  "playful",
] as const;

export interface BrandGuidelines {
  tone: BrandTone;
  /** Competitor names, overclaims ("guaranteed", "#1"), regulated language. */
  bannedTerms: string[];
  requiredDisclaimers: string[];
  valueProps: string[];
  targetPersona?: string | null;
  /** Target US grade level. Null/undefined = unconstrained, which is NOT the same as 0. */
  readingLevel?: number | null;
}

export type DropReason = "banned-term" | "reading-level";

export interface DroppedItem<T> {
  item: T;
  reason: DropReason;
  /** The banned term that matched, or the measured grade for a reading-level drop. */
  detail: string;
}

export interface BrandFilterResult<T> {
  kept: T[];
  dropped: DroppedItem<T>[];
}

/**
 * Grade level a term must exceed before a reading-level drop is allowed, and the minimum word count
 * below which the grade is not computed at all.
 *
 * Flesch-Kincaid divides by sentence count and averages syllables per word, so on a six-word ad
 * headline a single polysyllabic brand name swings the result by several grades. Applying it there
 * would drop good copy on statistical noise. 20 words is roughly where the estimate stabilises
 * enough to act on — long enough for a body or a description, which is exactly the copy where
 * reading level actually matters.
 */
const MIN_WORDS_FOR_READING_LEVEL = 20;

/**
 * Slack above the target grade before dropping. The formula's own standard error is around one
 * grade, so dropping at target+0 would fail copy that is, within the metric's precision, on target.
 */
const READING_LEVEL_TOLERANCE = 2;

/** Escapes a string for literal use inside a RegExp. Brand terms legitimately contain `+`, `.`, `*`. */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Case-insensitive whole-term match.
 *
 * `\b` is applied per-side and only where the term's own edge is a word character. A term like
 * `#1` starts with a non-word character, and `\b#` requires a word character immediately before the
 * `#` — so the naive `\b#1\b` never matches "the #1 choice", silently letting through the exact
 * overclaim the field exists to block. `C++` has the mirror problem at its end.
 */
function bannedTermPattern(term: string): RegExp {
  const escaped = escapeRegExp(term.trim());
  const leading = /^\w/.test(term.trim()) ? "\\b" : "";
  const trailing = /\w$/.test(term.trim()) ? "\\b" : "";
  return new RegExp(`${leading}${escaped}${trailing}`, "i");
}

/** The first banned term appearing in `text`, or null. Order follows `bannedTerms`, so it is stable. */
export function findBannedTerm(text: string, bannedTerms: string[]): string | null {
  for (const term of bannedTerms) {
    if (!term.trim()) continue;
    if (bannedTermPattern(term).test(text)) return term;
  }
  return null;
}

/**
 * Heuristic syllable count for one English word.
 *
 * Vowel-group counting with a silent-trailing-`e` correction — the standard approximation used by
 * every implementation of these formulas. It is wrong on irregular words ("queue", "business"); the
 * formulas were calibrated on the same approximation, so matching it is more faithful than being
 * cleverer than it.
 */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;

  const groups = w.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/**
 * Flesch-Kincaid grade level: `0.39·(words/sentences) + 11.8·(syllables/words) − 15.59`.
 *
 * Returns null below `MIN_WORDS_FOR_READING_LEVEL` rather than a number, because a grade computed
 * from one short sentence is noise and returning it invites a caller to act on it.
 */
export function fleschKincaidGrade(text: string): number | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS_FOR_READING_LEVEL) return null;

  // A trailing fragment with no terminator is still a sentence; never divide by zero.
  const sentences = Math.max(1, (text.match(/[.!?]+/g) ?? []).length);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

/** How many of `valueProps` appear in `text`. Used to rank, never to drop. */
export function countValuePropMatches(text: string, valueProps: string[]): number {
  return valueProps.filter((p) => p.trim() && text.toLowerCase().includes(p.trim().toLowerCase()))
    .length;
}

/**
 * Filters and ranks generator output against a workspace's guidelines.
 *
 * `extractText` returns every user-visible string in an item, so one implementation serves shapes as
 * different as `AdCopyVariant` (`{hook, body, cta}`), `UGCScript` and a bare RSA headline string.
 * The strings are joined for matching: a banned term split across a hook and a body is not a
 * violation, but a term in *any* field is.
 *
 * With no guidelines (the common case — most workspaces will never set one), everything is kept, in
 * the generator's original order. That is deliberate: an unconfigured brand should not silently
 * change what the generators have always returned.
 */
export function applyBrandGuidelines<T>(
  items: T[],
  guidelines: BrandGuidelines | null | undefined,
  extractText: (item: T) => string[],
): BrandFilterResult<T> {
  if (!guidelines) return { kept: [...items], dropped: [] };

  const kept: { item: T; valuePropMatches: number }[] = [];
  const dropped: DroppedItem<T>[] = [];

  for (const item of items) {
    const text = extractText(item).filter(Boolean).join(" ");

    const banned = findBannedTerm(text, guidelines.bannedTerms);
    if (banned) {
      dropped.push({ item, reason: "banned-term", detail: banned });
      continue;
    }

    if (guidelines.readingLevel != null) {
      const grade = fleschKincaidGrade(text);
      if (grade != null && grade > guidelines.readingLevel + READING_LEVEL_TOLERANCE) {
        dropped.push({ item, reason: "reading-level", detail: grade.toFixed(1) });
        continue;
      }
    }

    kept.push({ item, valuePropMatches: countValuePropMatches(text, guidelines.valueProps) });
  }

  // Stable rank: more value-prop echoes first, generator order preserved within a tier. A plain
  // `sort` comparator is stable in every engine we target, but the index tiebreak makes it explicit
  // rather than relying on that.
  const ranked = kept
    .map((k, index) => ({ ...k, index }))
    .sort((a, b) => b.valuePropMatches - a.valuePropMatches || a.index - b.index)
    .map((k) => k.item);

  return { kept: ranked, dropped };
}

/** Convenience wrapper for generators that return plain strings (RSA headlines/descriptions). */
export function applyBrandGuidelinesToStrings(
  items: string[],
  guidelines: BrandGuidelines | null | undefined,
): BrandFilterResult<string> {
  return applyBrandGuidelines(items, guidelines, (s) => [s]);
}

/**
 * Appends the first disclaimer that fits within `maxLength`.
 *
 * Length-aware because the channels this feeds are hard-capped — RSA headlines at 30 characters,
 * descriptions at 90 — and a disclaimer that overflows would be rejected by the ad platform, or
 * silently truncated into something that reads as a different claim. A disclaimer that cannot fit
 * is not appended, and the caller is told via `applied`, because quietly dropping a *required*
 * disclaimer is a compliance problem, not a formatting one.
 */
export function appendDisclaimer(
  text: string,
  disclaimers: string[],
  maxLength?: number,
): { text: string; applied: string | null } {
  const candidates = disclaimers.filter((d) => d.trim());
  if (candidates.length === 0) return { text, applied: null };

  for (const disclaimer of candidates) {
    const combined = `${text} ${disclaimer.trim()}`;
    if (maxLength == null || combined.length <= maxLength) {
      return { text: combined, applied: disclaimer.trim() };
    }
  }

  return { text, applied: null };
}
