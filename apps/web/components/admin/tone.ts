/**
 * What a row's state looks like in the console.
 *
 * Colour here has exactly one job: say what needs a human. Neutral is the default and covers most
 * rows most of the time; gold means someone should look this week; rose means it is broken now.
 * Ember (`--primary`) is never a state — it belongs to the operator's own actions, so a button
 * never competes with a status for attention.
 *
 * The panel this replaces rendered every trialing workspace in gold, which was every workspace, so
 * the entire status column was gold and gold meant nothing. Trialing is neutral: it is the normal
 * condition of a new account.
 *
 * **The spine.** Instead of a status column you read, each row carries a 2px marker on its left
 * edge. Scanning down the edge of a long directory shows the exceptions without reading a word,
 * which is what makes a thousand rows workable. It is a border on the row itself, so it costs no
 * extra element and works inside a `<TableRow>`.
 */

export type Tone = "neutral" | "attention" | "broken";

/** Left-edge marker. Always paired with `border-l-2` so rows stay aligned whatever their state. */
export function spineClass(tone: Tone): string {
  switch (tone) {
    case "broken":
      return "border-l-destructive";
    case "attention":
      return "border-l-warning";
    default:
      // Transparent rather than absent: a row with no border would sit 2px to the left of its
      // neighbours, and the column of names would visibly wobble as states changed.
      return "border-l-transparent";
  }
}

/** Text colour for the phrase that explains the state. */
export function toneTextClass(tone: Tone): string {
  switch (tone) {
    case "broken":
      return "text-destructive";
    case "attention":
      return "text-warning";
    default:
      return "text-muted-foreground";
  }
}

/**
 * A subscription's state.
 *
 * `past_due` is money that did not arrive and `canceled` is a customer who left — both need a
 * person. `active` and `trialing` are the two ways of being fine.
 */
export function subscriptionTone(status: string): Tone {
  if (status === "past_due") return "broken";
  if (status === "canceled") return "attention";
  return "neutral";
}

/** Trials go gold in their last three days, and stay gold once they have lapsed. */
export function trialTone(daysLeft: number | null): Tone {
  if (daysLeft === null) return "neutral";
  if (daysLeft < 0) return "broken";
  return daysLeft <= 3 ? "attention" : "neutral";
}

/** A disconnected integration is broken; one that has simply gone quiet needs a look. */
export function connectionTone(isActive: boolean, daysSinceSync: number | null): Tone {
  if (!isActive) return "broken";
  if (daysSinceSync !== null && daysSinceSync >= 7) return "attention";
  return "neutral";
}

/**
 * The `<Badge>` variant for a tone, for the few places a state is a chip rather than a spine.
 * Neutral maps to `muted` rather than `success`: a badge shouting green at every healthy row is
 * the same mistake as gold on every trial, one hue further along.
 */
export function badgeVariantForTone(tone: Tone): "warning" | "destructive" | "muted" {
  if (tone === "broken") return "destructive";
  if (tone === "attention") return "warning";
  return "muted";
}
