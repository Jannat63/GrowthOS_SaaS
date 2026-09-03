import type { Recommendation } from "@growthos/types";

/**
 * Priority bands, and why the queue is grouped rather than ranked.
 *
 * `compositeScore` is presented as a ranking but is close to a three-value enum. Every
 * `cross_channel` recommendation is scored with a constant effort (40) and an urgency derived
 * purely from its impact bucket, so its composite can only be 80, 57 or 35. Measured across the
 * four generators over the seeded fixtures: 28 rows produce 84, 80×6, 69, 58, 57×13, 54×2, 52 and
 * 35×3 — 22 of the 28 share a score with at least one other row.
 *
 * A flat descending list therefore claims a precision the data does not have: the difference
 * between position 9 and position 20 is usually nothing at all. Grouping into bands states what is
 * actually known — three tiers of priority — and leaves the order inside a band to the tiebreaker
 * that answers a real question (cheapest first), instead of implying the 13 rows tied at 57 are
 * ranked against each other.
 *
 * The thresholds sit on the natural gaps in that distribution: 80 -> 69 and 52 -> 35.
 */
export const BANDS = [
  {
    key: "now",
    label: "Do first",
    rule: "Priority 70+",
    blurb: "Highest combined impact and urgency.",
    min: 70,
  },
  {
    key: "next",
    label: "Next",
    rule: "Priority 45–69",
    blurb: "Worth doing once the top of the queue is clear.",
    min: 45,
  },
  {
    key: "later",
    label: "Backlog",
    rule: "Under 45",
    blurb: "Low impact — revisit when the channel data changes.",
    min: -Infinity,
  },
] as const;

export type BandKey = (typeof BANDS)[number]["key"];

export function bandOf(rec: Recommendation): BandKey {
  return (BANDS.find((b) => rec.compositeScore >= b.min) ?? BANDS[BANDS.length - 1]!).key;
}

/**
 * Effort, as something a person can act on.
 *
 * `effortScore` is a 0–100 field that has never been shown. Printed raw it is another opaque
 * number competing with priority; as a word it answers "can I clear this now", which is the
 * question that actually decides what gets picked out of a band of equals.
 */
export function effortLabel(score: number): "Quick" | "Moderate" | "Involved" {
  if (score <= 40) return "Quick";
  if (score <= 60) return "Moderate";
  return "Involved";
}

/** Days since generation, or null when the API didn't supply a timestamp (offline fallback). */
export function ageInDays(createdAt: string | null): number | null {
  if (!createdAt) return null;
  const ms = Date.now() - new Date(createdAt).getTime();
  return ms < 0 ? 0 : Math.floor(ms / 86_400_000);
}

export function formatAge(createdAt: string | null): string | null {
  const days = ageInDays(createdAt);
  if (days === null) return null;
  if (days === 0) return "Today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

/** Short, unambiguous date — "12 Sep". Used for due dates and snooze returns. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
