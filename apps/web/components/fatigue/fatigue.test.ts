import { describe, expect, it } from "vitest";
import type { ScoredCreative } from "@growthos/types";
import { FATIGUE_THRESHOLDS, breaches, bySeverity, ctrMovement, heldByAlertWindow } from "./fatigue";

const creative = (over: Partial<ScoredCreative>): ScoredCreative => ({
  name: "c",
  frequency: 1,
  ctrThisWeek: 2,
  ctrLastWeek: 2,
  ctrDeclinePercent: 0,
  hoursSinceLaunch: 100,
  status: "healthy",
  message: "",
  ...over,
});

describe("ctrMovement", () => {
  it("says which way CTR moved instead of printing an inverted delta", () => {
    // `ctrDeclinePercent` is a DECLINE: +31 means CTR fell 31%, -3 means it rose 3%. Rendered
    // straight, the monitor showed the worst row as "Δ 31%" and a recovering one as "Δ -3%".
    expect(ctrMovement({ ctrDeclinePercent: 30.8 })).toMatchObject({
      direction: "down",
      label: "down 31%",
    });
    expect(ctrMovement({ ctrDeclinePercent: -3.3 })).toMatchObject({
      direction: "up",
      label: "up 3%",
    });
  });

  it("calls sub-half-point noise flat rather than naming a trend", () => {
    expect(ctrMovement({ ctrDeclinePercent: 0.2 }).direction).toBe("flat");
    expect(ctrMovement({ ctrDeclinePercent: -0.4 }).direction).toBe("flat");
  });
});

describe("breaches", () => {
  it("reports each threshold the creative is actually over", () => {
    expect(breaches(creative({ frequency: 4.2, ctrDeclinePercent: 30.8 }))).toEqual([
      "frequency",
      "ctrDecline",
    ]);
    // "Dining Set — Special": over on frequency only, at 17% decline — which is why the page's old
    // subtitle ("frequency > 3 AND CTR down > 20%") contradicted its own contents.
    expect(breaches(creative({ frequency: 3.6, ctrDeclinePercent: 17.4 }))).toEqual(["frequency"]);
    expect(breaches(creative({ frequency: 2.1, ctrDeclinePercent: 4 }))).toEqual([]);
  });

  it("treats the threshold as exclusive, matching the engine", () => {
    expect(breaches(creative({ frequency: FATIGUE_THRESHOLDS.frequency }))).toEqual([]);
    expect(breaches(creative({ frequency: FATIGUE_THRESHOLDS.frequency + 0.1 }))).toEqual([
      "frequency",
    ]);
  });
});

describe("heldByAlertWindow", () => {
  it("explains a breach that is too new to be judged", () => {
    const msg = heldByAlertWindow(creative({ frequency: 4, hoursSinceLaunch: 30 }));
    expect(msg).toContain("30h old");
    expect(msg).toContain("42h"); // 72 - 30
  });

  it("says nothing when there is nothing to explain", () => {
    expect(heldByAlertWindow(creative({ frequency: 1, hoursSinceLaunch: 10 }))).toBeNull();
    expect(heldByAlertWindow(creative({ frequency: 4, hoursSinceLaunch: 100 }))).toBeNull();
    expect(heldByAlertWindow(creative({ frequency: 4, status: "at-risk" }))).toBeNull();
  });
});

describe("bySeverity", () => {
  it("puts what needs attention first, worst frequency leading each band", () => {
    const rows = [
      creative({ name: "healthy", status: "healthy" }),
      creative({ name: "risk-low", status: "at-risk", frequency: 3.2 }),
      creative({ name: "bad", status: "fatigued", frequency: 4.2 }),
      creative({ name: "risk-high", status: "at-risk", frequency: 3.9 }),
    ].sort(bySeverity);
    expect(rows.map((r) => r.name)).toEqual(["bad", "risk-high", "risk-low", "healthy"]);
  });
});
