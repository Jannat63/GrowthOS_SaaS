/**
 * Shared text helpers for the deterministic brief generators (D4 — no LLM in this path).
 *
 * These lived as private copies inside `content-brief.ts` and `creative-brief.ts`. The copies had
 * already drifted: `titleCase` was fixed in one of them and left broken in the other, so the same
 * keyword produced "Best Office Chair for Back Pain" in a content brief and "Best Office Chair For
 * Back Pain" in an ad headline. One home, so a fix reaches both.
 */

/** Words a headline leaves lowercase unless they open or close it. */
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or",
  "the", "to", "up", "vs", "via", "with",
]);

/**
 * Acronyms commercial search terms actually carry. Without these, `gaming chair rgb` becomes
 * "Gaming Chair Rgb" — in an H1 someone pastes into a CMS, and in a Meta ad headline.
 */
const ACRONYMS = new Set([
  "rgb", "seo", "usb", "led", "tv", "pc", "hd", "uhd", "suv", "diy", "ac", "hvac", "4k", "oled",
]);

/**
 * Title case as a headline is actually written.
 *
 * The naive `/\b\w/g` uppercase capitalises every word including function words, which is what
 * produced "Best Office Chair For Back Pain".
 */
export function titleCase(s: string): string {
  const words = s.trim().split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (i > 0 && i < words.length - 1 && MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Qualifiers a search term routinely opens with, which a template then redundantly adds again. */
const LEADING_QUALIFIERS = new Set([
  "best", "top", "cheap", "cheapest", "good", "great", "affordable",
]);

/**
 * The keyword with a leading qualifier removed, for slots that supply their own.
 *
 * "best office chair for back pain" through a template that prefixes "the best" produced "What is
 * the best best office chair for back pain?". Only the first word is considered — a qualifier is
 * only redundant where the template puts its own in front of it.
 */
export function coreTopic(keyword: string): string {
  const words = keyword.trim().split(/\s+/);
  if (words.length > 1 && LEADING_QUALIFIERS.has(words[0]!.toLowerCase())) {
    return words.slice(1).join(" ");
  }
  return keyword.trim();
}

/**
 * "a" or "an" for the following phrase.
 *
 * Vowel-initial is the right test for the overwhelming majority of product terms. The English
 * exceptions (a "user", an "hour") are not shapes a commercial search term takes, and guessing at
 * them would cost more than it returns.
 */
export function article(phrase: string): string {
  return /^[aeiou]/i.test(phrase.trim()) ? "an" : "a";
}
