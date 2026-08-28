import type { CreativeBrief, CreativePlay, TopOrganicPage } from "@growthos/types";
import { META_LIMITS } from "@growthos/logic";

export { META_LIMITS };

/**
 * What each play is called on screen.
 *
 * `own` and `claim` are how the generator reasons; they are not what a media buyer calls the two
 * situations. The label names the job the ad has to do, which is the thing the reader is choosing
 * between when they decide what to build next.
 */
export const PLAY_LABEL: Record<CreativePlay, string> = {
  own: "Extend reach",
  claim: "Earn the click",
};

export const PLAY_BLURB: Record<CreativePlay, string> = {
  own: "The site already ranks top-3 for these, so the ad buys reach on a topic the page wins.",
  claim:
    "Page one but below the fold. The ad has to earn a click the ranking is not winning on its own.",
};

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
  const lines: string[] = [title];

  // Why the ad opens the way it does. Absent on briefs stored before plays existed, and the paste
  // has to stay useful for those rather than printing an empty heading.
  if (b.play || b.rationale) {
    lines.push("", "THE PLAY");
    if (b.play) lines.push(PLAY_LABEL[b.play]);
    if (b.rationale) lines.push(b.rationale);
  }

  lines.push(
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
    `Call to action: ${b.callToAction}`
  );

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
