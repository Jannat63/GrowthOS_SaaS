import { describe, it, expect } from "vitest";
import { median, scoreCreatives, type ScorecardInput } from "./creative-scorecard.js";

/** A healthy baseline creative; override only what a test is about. */
const creative = (name: string, overrides: Partial<ScorecardInput> = {}): ScorecardInput => ({
  name,
  ctrThisWeek: 2,
  ctrLastWeek: 2,
  frequency: 1.5,
  hoursSinceLaunch: 200,
  ...overrides,
});

/** Five at CTR 2.0 → median 2.0, so a sixth can be placed anywhere relative to it. */
const baselineFive = (): ScorecardInput[] => [
  creative("A"),
  creative("B"),
  creative("C"),
  creative("D"),
  creative("E"),
];

const find = (result: ReturnType<typeof scoreCreatives>, name: string) =>
  result.scores.find((s) => s.name === name)!;

describe("median", () => {
  it("returns the middle value of an odd-length list", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the middle pair of an even-length list", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns null for an empty list rather than NaN", () => {
    expect(median([])).toBeNull();
  });

  it("ignores non-finite values", () => {
    expect(median([1, Number.NaN, 3])).toBe(2);
  });
});

describe("scoreCreatives", () => {
  describe("insufficient data", () => {
    it("refuses to grade an account with too few creatives", () => {
      // With three creatives the median IS one of them. A confident band here would say more about
      // the sample size than the creative.
      const result = scoreCreatives([creative("A"), creative("B"), creative("C")]);

      expect(result.medianCtr).toBeNull();
      expect(result.scores.every((s) => s.band === "insufficient-data")).toBe(true);
      expect(result.scores.every((s) => s.driver === "not-enough-creatives")).toBe(true);
    });

    it("says how many it has and how many it needs, rather than failing silently", () => {
      const result = scoreCreatives([creative("A"), creative("B")]);
      expect(result.creativeCount).toBe(2);
      expect(result.scores[0]!.reason).toMatch(/Only 2 creatives/);
      expect(result.scores[0]!.reason).toMatch(/at least 5/);
    });

    it("still reports the observed CTR it could not grade", () => {
      // The number is real even when the verdict is withheld; hiding it would be a downgrade.
      const result = scoreCreatives([creative("A", { ctrThisWeek: 3.1 })]);
      expect(result.scores[0]!.ctr).toBe(3.1);
      expect(result.scores[0]!.medianCtr).toBeNull();
    });

    it("grades an account once it reaches the threshold", () => {
      const result = scoreCreatives(baselineFive());
      expect(result.medianCtr).toBe(2);
      expect(result.scores.every((s) => s.band !== "insufficient-data")).toBe(true);
    });
  });

  describe("bands", () => {
    it("calls a creative well above the account median strong", () => {
      const result = scoreCreatives([...baselineFive(), creative("Winner", { ctrThisWeek: 4, ctrLastWeek: 4 })]);
      const winner = find(result, "Winner");

      expect(winner.band).toBe("strong");
      expect(winner.driver).toBe("above-median");
      expect(winner.ctrVsMedianPercent).toBeGreaterThan(0);
    });

    it("calls a creative near the median average rather than nudging it either way", () => {
      const result = scoreCreatives([...baselineFive(), creative("Typical", { ctrThisWeek: 2.1, ctrLastWeek: 2.1 })]);
      expect(find(result, "Typical").band).toBe("average");
      expect(find(result, "Typical").driver).toBe("near-median");
    });

    it("phrases every band relative to the account, never as a claim about the creative alone", () => {
      // CTR is mid-funnel and reflects targeting as much as creative. The wording is the guardrail.
      const result = scoreCreatives([...baselineFive(), creative("Loser", { ctrThisWeek: 0.5, ctrLastWeek: 0.5 })]);
      expect(find(result, "Loser").reason).toMatch(/this account's median/);
    });
  });

  describe("discriminators — which KIND of underperforming", () => {
    it("names saturation when a below-median creative is over the frequency threshold", () => {
      const result = scoreCreatives([
        ...baselineFive(),
        creative("Saturated", { ctrThisWeek: 0.5, ctrLastWeek: 0.5, frequency: 6 }),
      ]);
      const s = find(result, "Saturated");

      expect(s.band).toBe("underperforming");
      expect(s.driver).toBe("saturated");
      expect(s.reason).toMatch(/widen targeting/);
    });

    it("names fatigue when a below-median creative is declining week-over-week", () => {
      const result = scoreCreatives([
        ...baselineFive(),
        // Declining hard, but frequency stays under the saturation threshold.
        creative("Fatiguing", { ctrThisWeek: 0.5, ctrLastWeek: 2.5, frequency: 1.2 }),
      ]);
      const s = find(result, "Fatiguing");

      expect(s.driver).toBe("fatiguing");
      expect(s.reason).toMatch(/refresh rather than replace/);
    });

    it("names a genuinely weak creative when neither discriminator applies", () => {
      const result = scoreCreatives([
        ...baselineFive(),
        creative("Weak", { ctrThisWeek: 0.5, ctrLastWeek: 0.5, frequency: 1.1 }),
      ]);
      const s = find(result, "Weak");

      expect(s.driver).toBe("weak");
      expect(s.reason).toMatch(/has not connected/);
    });

    it("prefers saturation over fatigue when both apply, because it is the fixable one", () => {
      // A saturated creative that is also declining is declining BECAUSE it is saturated. Telling
      // the user to rewrite the copy would be the wrong action.
      const result = scoreCreatives([
        ...baselineFive(),
        creative("Both", { ctrThisWeek: 0.5, ctrLastWeek: 2.5, frequency: 7 }),
      ]);
      expect(find(result, "Both").driver).toBe("saturated");
    });
  });

  describe("output contract", () => {
    it("never returns a bare number — every score carries its reason and its reference", () => {
      const result = scoreCreatives([...baselineFive(), creative("X", { ctrThisWeek: 0.4 })]);
      for (const s of result.scores) {
        expect(s.reason.length).toBeGreaterThan(0);
        expect(s.medianCtr).not.toBeNull();
      }
    });

    it("orders worst first, so the list opens on the work", () => {
      const result = scoreCreatives([
        ...baselineFive(),
        creative("Great", { ctrThisWeek: 5, ctrLastWeek: 5 }),
        creative("Terrible", { ctrThisWeek: 0.2, ctrLastWeek: 0.2 }),
      ]);

      expect(result.scores[0]!.name).toBe("Terrible");
      expect(result.scores[result.scores.length - 1]!.name).toBe("Great");
    });

    it("reports cpm for context but does not let it change the band", () => {
      // cpm is a constant in seeded data and needs spend/conversions to mean anything.
      const cheap = scoreCreatives([...baselineFive(), creative("C1", { ctrThisWeek: 4, cpm: 1 })]);
      const pricey = scoreCreatives([...baselineFive(), creative("C1", { ctrThisWeek: 4, cpm: 500 })]);

      expect(find(cheap, "C1").band).toBe(find(pricey, "C1").band);
      expect(find(cheap, "C1").cpm).toBe(1);
      expect(find(pricey, "C1").cpm).toBe(500);
    });

    it("reports null cpm rather than zero when it is absent", () => {
      // 0 is a real CPM. Conflating "absent" with "free" would be a lie about a cost.
      const result = scoreCreatives(baselineFive());
      expect(result.scores[0]!.cpm).toBeNull();
    });

    it("does not divide by a zero median", () => {
      const allZero = scoreCreatives([
        creative("A", { ctrThisWeek: 0, ctrLastWeek: 0 }),
        creative("B", { ctrThisWeek: 0, ctrLastWeek: 0 }),
        creative("C", { ctrThisWeek: 0, ctrLastWeek: 0 }),
        creative("D", { ctrThisWeek: 0, ctrLastWeek: 0 }),
        creative("E", { ctrThisWeek: 0, ctrLastWeek: 0 }),
      ]);

      expect(allZero.scores.every((s) => s.band === "insufficient-data")).toBe(true);
      expect(allZero.scores.every((s) => s.ctrVsMedianPercent === null)).toBe(true);
    });

    it("handles an empty account without throwing", () => {
      const result = scoreCreatives([]);
      expect(result.scores).toEqual([]);
      expect(result.creativeCount).toBe(0);
      expect(result.medianCtr).toBeNull();
    });
  });
});
