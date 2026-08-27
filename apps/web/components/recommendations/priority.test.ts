import { describe, expect, it } from "vitest";
import type { Recommendation } from "@growthos/types";
import { BANDS, bandOf, effortLabel, formatAge, shortDate } from "./priority";

const rec = (compositeScore: number): Recommendation => ({
  id: "r1",
  workspaceId: "ws",
  type: "cross_channel",
  sourceChannel: "seo",
  targetChannel: "google_ads",
  title: "t",
  body: "b",
  actionLabel: null,
  impactScore: 0,
  effortScore: 40,
  urgencyScore: 0,
  compositeScore,
  status: "pending",
  assignedTo: null,
  dueDate: null,
  snoozedUntil: null,
  actedAt: null,
  createdAt: null,
  commentCount: 0,
});

describe("bandOf", () => {
  it("puts each score in exactly one band", () => {
    // The bands must partition the range — a score falling through would drop a row off the page
    // entirely, since the page renders band by band.
    for (const score of [0, 34, 35, 44, 45, 57, 69, 70, 80, 84, 100]) {
      const matches = BANDS.filter((b) => bandOf(rec(score)) === b.key);
      expect(matches, `score ${score}`).toHaveLength(1);
    }
  });

  it("splits on the gaps the real score distribution actually has", () => {
    // Measured across the four generators over the seeded fixtures: 84, 80x6 | 69, 58, 57x13,
    // 54x2, 52 | 35x3. The thresholds sit in the 80->69 and 52->35 gaps, not on round numbers.
    expect(bandOf(rec(84))).toBe("now");
    expect(bandOf(rec(80))).toBe("now");
    expect(bandOf(rec(69))).toBe("next");
    expect(bandOf(rec(57))).toBe("next");
    expect(bandOf(rec(52))).toBe("next");
    expect(bandOf(rec(35))).toBe("later");
  });
});

describe("effortLabel", () => {
  it("names every effort score the generators actually produce", () => {
    // 35 (fatigue), 40 (cross-channel), 50 (organic-to-paid), 55 (paid-to-organic).
    expect(effortLabel(35)).toBe("Quick");
    expect(effortLabel(40)).toBe("Quick");
    expect(effortLabel(50)).toBe("Moderate");
    expect(effortLabel(55)).toBe("Moderate");
    expect(effortLabel(85)).toBe("Involved");
  });
});

describe("formatAge", () => {
  it("returns null when the API gave no timestamp, rather than inventing one", () => {
    // The offline fallback has no created date; "Today" there would be a claim about data that
    // does not exist.
    expect(formatAge(null)).toBeNull();
  });

  it("reads as an age, not a date", () => {
    expect(formatAge(new Date().toISOString())).toBe("Today");
    expect(formatAge(new Date(Date.now() - 86_400_000).toISOString())).toBe("1 day old");
    expect(formatAge(new Date(Date.now() - 5 * 86_400_000).toISOString())).toBe("5 days old");
  });

  it("does not report a future timestamp as negative", () => {
    expect(formatAge(new Date(Date.now() + 86_400_000).toISOString())).toBe("Today");
  });
});

describe("shortDate", () => {
  it("formats a due date unambiguously", () => {
    const out = shortDate("2026-09-12T00:00:00.000Z");
    expect(out).toMatch(/Sep/);
    expect(out).toMatch(/12|11/); // local timezone may shift the day
  });
});
