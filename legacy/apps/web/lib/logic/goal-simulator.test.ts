import { describe, it, expect } from "vitest";
import { simulateGoal, SimulatorBaseline } from "./goal-simulator";

const baseline: SimulatorBaseline = { currentConversionRate: 0.025, currentAOV: 70 };

describe("simulateGoal", () => {
  it("projects conversions as sessions * conversion rate", () => {
    const result = simulateGoal(baseline, { targetSessions: 100000 });
    expect(result.projectedConversions).toBe(2500);
  });

  it("projects revenue as conversions * AOV", () => {
    const result = simulateGoal(baseline, { targetSessions: 100000 });
    expect(result.projectedRevenue).toBe(2500 * 70);
  });

  it("gives High confidence at or below 150,000 sessions", () => {
    expect(simulateGoal(baseline, { targetSessions: 150000 }).confidence).toBe("High");
    expect(simulateGoal(baseline, { targetSessions: 50000 }).confidence).toBe("High");
  });

  it("gives Medium confidence between 150,001 and 300,000 sessions", () => {
    expect(simulateGoal(baseline, { targetSessions: 200000 }).confidence).toBe("Medium");
  });

  it("gives Low confidence above 300,000 sessions", () => {
    expect(simulateGoal(baseline, { targetSessions: 500000 }).confidence).toBe("Low");
  });

  it("returns zero projections for zero target sessions", () => {
    const result = simulateGoal(baseline, { targetSessions: 0 });
    expect(result.projectedConversions).toBe(0);
    expect(result.projectedRevenue).toBe(0);
  });

  it("scales linearly with target sessions", () => {
    const half = simulateGoal(baseline, { targetSessions: 100000 });
    const double = simulateGoal(baseline, { targetSessions: 200000 });
    expect(double.projectedConversions).toBe(half.projectedConversions * 2);
  });
});
