import { describe, it, expect } from "vitest";
import {
  buildResult,
  canTransition,
  transitionError,
  validateConclusion,
  type ExperimentStatus,
} from "./creative-experiments.js";

describe("canTransition", () => {
  it.each([
    ["draft", "running"],
    ["draft", "concluded"], // abandoned before launch — a real outcome worth recording
    ["running", "concluded"],
    ["running", "draft"], // un-launch a mistake
  ] as [ExperimentStatus, ExperimentStatus][])("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["concluded", "draft"],
    ["concluded", "running"],
  ] as [ExperimentStatus, ExperimentStatus][])("refuses %s → %s", (from, to) => {
    // A log whose history can be rewritten is not a log.
    expect(canTransition(from, to)).toBe(false);
  });

  it("refuses a no-op transition rather than silently accepting it", () => {
    // Accepting draft → draft would let a status write look successful while changing nothing,
    // which reads to the caller as a state change that never happened.
    expect(canTransition("draft", "draft")).toBe(false);
    expect(canTransition("concluded", "concluded")).toBe(false);
  });
});

describe("transitionError", () => {
  it("returns null for an allowed move", () => {
    expect(transitionError("draft", "running")).toBeNull();
  });

  it("explains that a concluded experiment is part of the record", () => {
    const message = transitionError("concluded", "running");
    expect(message).toMatch(/concluded/i);
    expect(message).toMatch(/new experiment/i);
  });

  it("names both states for an ordinary invalid move", () => {
    expect(transitionError("draft", "draft")).toMatch(/already draft/);
  });
});

describe("validateConclusion", () => {
  it("accepts a winner with no notes", () => {
    expect(validateConclusion({ winner: "a" }).ok).toBe(true);
  });

  it("requires notes when the result is inconclusive", () => {
    // "We could not tell" is only useful to a future reader if it says what was seen.
    const result = validateConclusion({ winner: "inconclusive" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/what you saw/i);
  });

  it("accepts an inconclusive result that explains itself", () => {
    expect(
      validateConclusion({ winner: "inconclusive", notes: "Ran only four days, too little spend." })
        .ok,
    ).toBe(true);
  });

  it("treats whitespace-only notes as absent", () => {
    expect(validateConclusion({ winner: "inconclusive", notes: "   " }).ok).toBe(false);
  });

  it("refuses a negative metric rather than storing nonsense", () => {
    expect(validateConclusion({ winner: "a", metricA: -1 }).ok).toBe(false);
  });

  it("refuses a non-finite metric", () => {
    expect(validateConclusion({ winner: "a", metricB: Number.NaN }).ok).toBe(false);
    expect(validateConclusion({ winner: "a", metricB: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });

  it("accepts zero, which is a real measurement", () => {
    expect(validateConclusion({ winner: "b", metricA: 0, metricB: 2.4 }).ok).toBe(true);
  });

  it("does NOT overrule a winner that disagrees with the reported numbers", () => {
    // The user may pick B despite A's higher CTR because B drove revenue they can see and we
    // cannot. Overruling them from two numbers we did not measure would be false confidence.
    expect(validateConclusion({ winner: "b", metricA: 9.9, metricB: 0.1 }).ok).toBe(true);
  });
});

describe("buildResult", () => {
  const at = new Date("2026-08-27T10:00:00.000Z");

  it("always marks the result self-reported", () => {
    // Centralised precisely so no call site can forget it: without the flag, a later consumer
    // treats a hand-typed number as observed data.
    expect(buildResult({ winner: "a" }, "user-1", at).selfReported).toBe(true);
  });

  it("records who concluded it and when", () => {
    const result = buildResult({ winner: "a" }, "user-1", at);
    expect(result.concludedBy).toBe("user-1");
    expect(result.concludedAt).toBe("2026-08-27T10:00:00.000Z");
  });

  it("trims notes and defaults them to an empty string", () => {
    expect(buildResult({ winner: "a", notes: "  clear win  " }, "u", at).notes).toBe("clear win");
    expect(buildResult({ winner: "a" }, "u", at).notes).toBe("");
  });

  it("carries the reported metrics through unchanged", () => {
    const result = buildResult({ winner: "a", metricA: 2.4, metricB: 1.1 }, "u", at);
    expect(result.metricA).toBe(2.4);
    expect(result.metricB).toBe(1.1);
  });
});
