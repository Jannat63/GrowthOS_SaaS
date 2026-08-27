// Creative scorecard (M4 · P4.2a-2). Grades creatives that have ACTUALLY RUN against the
// workspace's own trailing median, and says which are underperforming and why.
//
// WHAT THIS IS NOT: performance prediction. The roadmap bullet asked for predicted performance
// before a creative runs. Doing that honestly needs a model trained on historical creative
// attributes and their outcomes; this codebase has no model, no training data, and D4 defers the
// Anthropic API. A formula returning a confident-looking predicted CTR would be fabricated numbers
// rendered as real — `AUDIT-2026-08-13-codebase.md` #14. Grading what already ran is a smaller
// claim and a true one.
//
// THE REFERENCE IS THE ACCOUNT'S OWN MEDIAN, not a published benchmark. A benchmark alone punishes
// a brand in an expensive vertical, needs external attribution to be revalidated, and decays. The
// self-median needs none of that and is vertical-adjusted for free. Published benchmarks are a
// deferred SECONDARY reference — see the plan; the three figures originally proposed carried no
// source and two named platforms this system does not ingest.
//
// WHY CTR CARRIES THE SCORE HERE, having been demoted in the original design: it is the only
// performance RATE the `creative_performance` table holds. Hook rate and hold rate — the honest
// primary inputs for video creative — are not columns and cannot be until Meta App Review lands.
// `cpm` is a constant in seeded data and needs spend/conversions to mean anything, so it is
// reported but never scored. The `fatigue_score` COLUMN is excluded entirely: it is written as a
// literal 0 and nothing ever updates it, so scoring on it would give every creative an identical
// dimension while looking like a real input.
//
// Because CTR is mid-funnel and reflects targeting as much as creative, every band is phrased
// RELATIVE TO THIS ACCOUNT and never as a claim about the creative in isolation.

import { detectFatigue, type CreativePerformance, type FatigueStatus } from "./creative-fatigue.js";

export type ScoreBand = "strong" | "average" | "underperforming" | "insufficient-data";

/** Why a creative landed in its band. Named so the UI never has to infer intent from a number. */
export type ScoreDriver =
  | "above-median"
  | "near-median"
  | "saturated" // below median AND over the frequency threshold — an audience problem
  | "fatiguing" // below median AND declining week-over-week — a staleness problem
  | "weak" // below median with neither — the creative itself
  | "not-enough-creatives";

export interface ScorecardInput extends CreativePerformance {
  /** Reported for context only; never scored. See the module header. */
  cpm?: number | undefined;
}

export interface CreativeScore {
  name: string;
  band: ScoreBand;
  driver: ScoreDriver;
  /** Observed trailing-week CTR, %. */
  ctr: number;
  /** The account median this was compared against, %. Null when there was no usable median. */
  medianCtr: number | null;
  /** Signed % difference from the median. Null when there was no usable median. */
  ctrVsMedianPercent: number | null;
  frequency: number;
  cpm: number | null;
  fatigueStatus: FatigueStatus;
  /** Plain-language reason naming the observation, the reference, and the discriminator. */
  reason: string;
}

export interface ScorecardResult {
  scores: CreativeScore[];
  /** The trailing-week CTR median across the account, %. Null below MIN_CREATIVES. */
  medianCtr: number | null;
  /** How many creatives were scored. Surfaced so a thin account can say so rather than imply depth. */
  creativeCount: number;
}

/**
 * Below this, a self-median is noise rather than a reference.
 *
 * With three creatives the median IS one of the three, so two of them are graded against a peer and
 * the third against itself — a verdict that says more about the sample size than the creative. The
 * engine returns `insufficient-data` instead of a confident band, which is the same refusal
 * `fleschKincaidGrade` makes on short copy and for the same reason.
 */
const MIN_CREATIVES = 5;

/** Distance from the median, in %, inside which a creative is simply typical for the account. */
const NEAR_MEDIAN_BAND = 15;

/** Matches `creative-fatigue`'s own threshold — the point where frequency indicates saturation. */
const FREQUENCY_THRESHOLD = 3;

/** Median of a numeric list. Even-length lists average the middle pair. */
export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Grades every creative against the account's own trailing-week CTR median.
 *
 * Returns `insufficient-data` for all of them below `MIN_CREATIVES` rather than grading against a
 * median computed from too few rows.
 */
export function scoreCreatives(creatives: ScorecardInput[]): ScorecardResult {
  const creativeCount = creatives.length;

  if (creativeCount < MIN_CREATIVES) {
    return {
      creativeCount,
      medianCtr: null,
      scores: creatives.map((c) => ({
        name: c.name,
        band: "insufficient-data" as const,
        driver: "not-enough-creatives" as const,
        ctr: c.ctrThisWeek,
        medianCtr: null,
        ctrVsMedianPercent: null,
        frequency: c.frequency,
        cpm: c.cpm ?? null,
        fatigueStatus: detectFatigue(c).status,
        reason: `Only ${creativeCount} creative${creativeCount === 1 ? "" : "s"} with recent data — needs at least ${MIN_CREATIVES} before this account has a meaningful median to compare against.`,
      })),
    };
  }

  const medianCtr = median(creatives.map((c) => c.ctrThisWeek));

  const scores = creatives.map((c): CreativeScore => {
    const fatigue = detectFatigue(c);
    const cpm = c.cpm ?? null;

    // A zero or absent median cannot be divided by; grade nothing rather than emit Infinity.
    if (medianCtr == null || medianCtr === 0) {
      return {
        name: c.name,
        band: "insufficient-data",
        driver: "not-enough-creatives",
        ctr: c.ctrThisWeek,
        medianCtr: null,
        ctrVsMedianPercent: null,
        frequency: c.frequency,
        cpm,
        fatigueStatus: fatigue.status,
        reason: "No usable CTR median for this account yet.",
      };
    }

    const ctrVsMedianPercent = ((c.ctrThisWeek - medianCtr) / medianCtr) * 100;
    const shared = {
      name: c.name,
      ctr: c.ctrThisWeek,
      medianCtr,
      ctrVsMedianPercent,
      frequency: c.frequency,
      cpm,
      fatigueStatus: fatigue.status,
    };
    const vs = `${Math.abs(ctrVsMedianPercent).toFixed(0)}% ${ctrVsMedianPercent >= 0 ? "above" : "below"} this account's median (${medianCtr.toFixed(2)}%)`;

    if (ctrVsMedianPercent > NEAR_MEDIAN_BAND) {
      return {
        ...shared,
        band: "strong",
        driver: "above-median",
        reason: `CTR ${c.ctrThisWeek.toFixed(2)}% — ${vs}.`,
      };
    }

    if (ctrVsMedianPercent >= -NEAR_MEDIAN_BAND) {
      return {
        ...shared,
        band: "average",
        driver: "near-median",
        reason: `CTR ${c.ctrThisWeek.toFixed(2)}% — typical for this account (median ${medianCtr.toFixed(2)}%).`,
      };
    }

    // Below the band. WHICH kind of below is the whole point: three different problems with three
    // different actions, and reporting them as one "underperforming" number would lose that.
    if (c.frequency > FREQUENCY_THRESHOLD) {
      return {
        ...shared,
        band: "underperforming",
        driver: "saturated",
        reason: `CTR ${c.ctrThisWeek.toFixed(2)}% — ${vs}, at frequency ${c.frequency.toFixed(1)}. The audience has seen this too often; widen targeting before rewriting the creative.`,
      };
    }

    if (fatigue.status !== "healthy") {
      return {
        ...shared,
        band: "underperforming",
        driver: "fatiguing",
        reason: `CTR ${c.ctrThisWeek.toFixed(2)}% — ${vs}, and down ${fatigue.ctrDeclinePercent.toFixed(0)}% week-over-week. It worked before, so refresh rather than replace.`,
      };
    }

    return {
      ...shared,
      band: "underperforming",
      driver: "weak",
      reason: `CTR ${c.ctrThisWeek.toFixed(2)}% — ${vs}, at low frequency and without a week-over-week decline. This one has not connected.`,
    };
  });

  // Worst first: the list exists to be acted on, and a scorecard that opens with its winners buries
  // the work. Ties keep input order, which is the caller's (alphabetical from ClickHouse).
  const bandOrder: Record<ScoreBand, number> = {
    underperforming: 0,
    "insufficient-data": 1,
    average: 2,
    strong: 3,
  };
  const ranked = scores
    .map((s, index) => ({ s, index }))
    .sort(
      (a, b) =>
        bandOrder[a.s.band] - bandOrder[b.s.band] ||
        (a.s.ctrVsMedianPercent ?? 0) - (b.s.ctrVsMedianPercent ?? 0) ||
        a.index - b.index,
    )
    .map((r) => r.s);

  return { scores: ranked, medianCtr, creativeCount };
}
