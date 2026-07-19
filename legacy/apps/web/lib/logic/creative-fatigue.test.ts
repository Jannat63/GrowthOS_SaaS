import { describe, it, expect } from "vitest";
import { detectFatigue, detectFatigueAll, CreativePerformance } from "./creative-fatigue";

describe("detectFatigue", () => {
  it("flags as fatigued when frequency > 3 AND CTR down > 20%", () => {
    const c: CreativePerformance = { name: "ad1", frequency: 4.5, ctrThisWeek: 1.5, ctrLastWeek: 3.0, hoursSinceLaunch: 100 };
    expect(detectFatigue(c).status).toBe("fatigued");
  });

  it("does not flag fatigued when only frequency is high but CTR is stable", () => {
    const c: CreativePerformance = { name: "ad1", frequency: 4.5, ctrThisWeek: 2.9, ctrLastWeek: 3.0, hoursSinceLaunch: 100 };
    expect(detectFatigue(c).status).not.toBe("fatigued");
  });

  it("flags at-risk when frequency is high, CTR stable, but past the 72h alert window", () => {
    const c: CreativePerformance = { name: "ad1", frequency: 3.5, ctrThisWeek: 2.9, ctrLastWeek: 3.0, hoursSinceLaunch: 80 };
    expect(detectFatigue(c).status).toBe("at-risk");
  });

  it("stays healthy under the alert window even with high frequency", () => {
    const c: CreativePerformance = { name: "ad1", frequency: 3.5, ctrThisWeek: 2.9, ctrLastWeek: 3.0, hoursSinceLaunch: 40 };
    expect(detectFatigue(c).status).toBe("healthy");
  });

  it("stays healthy when frequency and CTR are both within normal range", () => {
    const c: CreativePerformance = { name: "ad1", frequency: 1.2, ctrThisWeek: 3.1, ctrLastWeek: 3.0, hoursSinceLaunch: 100 };
    expect(detectFatigue(c).status).toBe("healthy");
  });

  it("computes CTR decline percentage correctly", () => {
    const c: CreativePerformance = { name: "ad1", frequency: 1, ctrThisWeek: 2.0, ctrLastWeek: 4.0, hoursSinceLaunch: 10 };
    expect(detectFatigue(c).ctrDeclinePercent).toBe(50);
  });

  it("handles zero last-week CTR without dividing by zero", () => {
    const c: CreativePerformance = { name: "ad1", frequency: 1, ctrThisWeek: 0, ctrLastWeek: 0, hoursSinceLaunch: 10 };
    const result = detectFatigue(c);
    expect(Number.isFinite(result.ctrDeclinePercent)).toBe(true);
  });
});

describe("detectFatigueAll", () => {
  it("sorts fatigued first, then at-risk, then healthy", () => {
    const results = detectFatigueAll([
      { name: "healthy", frequency: 1, ctrThisWeek: 3, ctrLastWeek: 3, hoursSinceLaunch: 10 },
      { name: "fatigued", frequency: 5, ctrThisWeek: 1, ctrLastWeek: 3, hoursSinceLaunch: 100 },
      { name: "at-risk", frequency: 4, ctrThisWeek: 2.9, ctrLastWeek: 3, hoursSinceLaunch: 100 },
    ]);
    expect(results.map((r) => r.status)).toEqual(["fatigued", "at-risk", "healthy"]);
  });
});
