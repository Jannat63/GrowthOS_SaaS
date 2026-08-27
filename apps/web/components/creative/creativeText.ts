import type { CreativeBrief, TopOrganicPage } from "@growthos/types";
import { META_LIMITS } from "@growthos/logic";

export { META_LIMITS };

/**
 * The brief as something you can paste into Meta Ads Manager.
 *
 * A creative brief is a handoff, and this one had no way off the screen — the buyer was expected
 * to retype ad copy out of a card. Ordered the way the composer asks for it, with the character
 * counts that govern each field.
 */
export function creativeBriefToText(
  title: string,
  b: CreativeBrief,
  /** The organic page behind it; also the source of the keyword, so the two cannot disagree. */
  page: TopOrganicPage | undefined
): string {
  const lines: string[] = [
    title,
    "",
    "CONCEPT",
    `Angle: ${b.hook}`,
    `Format: ${b.format}`,
    `Audience: ${b.audience}`,
    "",
    "AD COPY",
    `Primary text (${b.primaryText.length}/${META_LIMITS.primaryText}):`,
    b.primaryText,
    "",
    `Headline (${b.headline.length}/${META_LIMITS.headline}):`,
    b.headline,
    "",
    `Call to action: ${b.callToAction}`,
  ];

  if (page) {
    lines.push(
      "",
      "WHY THIS KEYWORD",
      `"${page.keyword}" — ${page.volume.toLocaleString()} searches/mo, ranking ${
        page.currentPosition === null ? "unranked" : `#${page.currentPosition}`
      } organically.`
    );
  }

  return lines.join("\n");
}

/** How much of a field's character budget is used, clamped for the meter. */
export function budgetFraction(used: number, budget: number): number {
  return Math.min(1, used / budget);
}
