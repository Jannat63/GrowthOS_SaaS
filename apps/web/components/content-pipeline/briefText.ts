import type { ContentBrief } from "@growthos/types";

/**
 * What Google actually shows before it truncates.
 *
 * These are the constraints a writer is working against, and they are the reason the meta fields
 * belong on screen with a count rather than hidden. Both are approximate in reality — Google
 * measures pixels, not characters — so they are labelled as budgets, not limits.
 */
export const META_TITLE_BUDGET = 60;
export const META_DESCRIPTION_BUDGET = 160;

/**
 * The brief as markdown, for pasting into wherever the article actually gets written.
 *
 * A content brief is a handoff document. It was rendered as four derived numbers ("~1500 words ·
 * 4 sections · Article") with no way to get the real thing off the screen, which made the page a
 * dead end for the one person it exists to serve.
 */
export function briefToMarkdown(keyword: string, b: ContentBrief): string {
  const lines: string[] = [
    `# ${b.recommendedH1}`,
    "",
    `**Target keyword:** ${keyword}`,
    `**Target length:** ~${b.wordCount.toLocaleString()} words`,
    `**Schema:** ${b.schemaType}`,
    "",
    "## Outline",
    ...b.headingStructure.map((h, i) => `${i + 1}. ${h}`),
    "",
    "## Questions to answer",
    ...b.faqQuestions.map((q) => `- ${q}`),
    "",
    "## Meta",
    `**Title:** ${b.metaTitle}`,
    `**Description:** ${b.metaDescription}`,
  ];

  if (b.entities.length > 0) {
    lines.push("", "## Terms to work in", b.entities.join(", "));
  }
  // internalLinkTargets is always empty today — the generator has no site graph to draw from.
  // Emitting an empty heading would read as a section the writer forgot to fill in.
  if (b.internalLinkTargets.length > 0) {
    lines.push("", "## Internal links", ...b.internalLinkTargets.map((t) => `- ${t}`));
  }

  return lines.join("\n");
}

/** Cost per conversion, or null when a term has converted zero times. */
export function costPerConversion(cost: number, conversions: number): number | null {
  return conversions > 0 ? cost / conversions : null;
}

export function usdPrecise(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * A DOM-safe anchor id for a recommendation.
 *
 * Live ids are UUIDs, but the offline queue uses semantic ids like `p2o:best office chair for
 * back pain` — spaces and a colon, which are not valid in an `id` and break the `href="#..."`
 * that jumps from the search-terms table to the brief. Slugified so the link works on both paths.
 */
export function briefAnchorId(recId: string): string {
  return `brief-${recId.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")}`;
}
