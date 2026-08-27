import type { ScoredCreative } from "@growthos/types";
import { FATIGUE_THRESHOLDS } from "@growthos/logic";

export { FATIGUE_THRESHOLDS };

/**
 * The CTR move, in words rather than a signed number.
 *
 * `ctrDeclinePercent` is a *decline*: positive means CTR fell. Printed as "Δ −3%" that reads as a
 * loss when it is actually a 3% recovery, and "Δ 31%" reads as a gain when it is the worst row on
 * the page. The sign is inverted relative to every other delta in the product, so the direction is
 * stated instead of shown.
 */
export function ctrMovement(c: Pick<ScoredCreative, "ctrDeclinePercent">): {
  direction: "down" | "up" | "flat";
  magnitude: number;
  label: string;
} {
  const d = c.ctrDeclinePercent;
  // Under half a point either way is noise, not a trend worth naming.
  if (Math.abs(d) < 0.5) return { direction: "flat", magnitude: 0, label: "flat" };
  return d > 0
    ? { direction: "down", magnitude: d, label: `down ${d.toFixed(0)}%` }
    : { direction: "up", magnitude: -d, label: `up ${(-d).toFixed(0)}%` };
}

export type BreachKey = "frequency" | "ctrDecline";

/** Which thresholds this creative is over — the actual basis for its verdict. */
export function breaches(c: ScoredCreative): BreachKey[] {
  const out: BreachKey[] = [];
  if (c.frequency > FATIGUE_THRESHOLDS.frequency) out.push("frequency");
  if (c.ctrDeclinePercent > FATIGUE_THRESHOLDS.ctrDecline) out.push("ctrDecline");
  return out;
}

/**
 * Why a creative is not flagged despite being over a line, or null when there is nothing to
 * explain.
 *
 * The `at-risk` rule needs a breach *and* 72 hours of runtime. A creative over the frequency
 * threshold on day one is deliberately left alone — which looked like a missed alert, because the
 * window was invisible and `hoursSinceLaunch` was not even in the API response.
 */
export function heldByAlertWindow(c: ScoredCreative): string | null {
  if (c.status !== "healthy") return null;
  if (breaches(c).length === 0) return null;
  if (c.hoursSinceLaunch >= FATIGUE_THRESHOLDS.alertWindowHours) return null;
  const remaining = Math.ceil(FATIGUE_THRESHOLDS.alertWindowHours - c.hoursSinceLaunch);
  return `Over a threshold, but only ${Math.round(c.hoursSinceLaunch)}h old — too new to judge. Reassessed in ${remaining}h.`;
}

/**
 * The exact rule, written out. The page's subtitle used to state the `fatigued` AND and then list
 * rows that qualified on the `at-risk` OR — "Dining Set — Special" sat there as At risk with CTR
 * down 17%, which the stated rule excludes.
 */
export const RULE_TEXT = `Fatigued: frequency over ${FATIGUE_THRESHOLDS.frequency} and CTR down more than ${FATIGUE_THRESHOLDS.ctrDecline}% week over week. At risk: either one, once the creative has run ${FATIGUE_THRESHOLDS.alertWindowHours} hours.`;

/** Severity first, then worst frequency — so the row that needs attention is always at the top. */
export function bySeverity(a: ScoredCreative, b: ScoredCreative): number {
  const order = { fatigued: 0, "at-risk": 1, healthy: 2 } as const;
  return order[a.status] - order[b.status] || b.frequency - a.frequency;
}
