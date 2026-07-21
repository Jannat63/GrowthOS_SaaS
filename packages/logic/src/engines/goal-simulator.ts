// Real logic for the Goal Simulator — projects revenue/conversions from
// target sessions using current blended conversion rate + AOV, matching
// the "Adjust targets and see how different goals impact your forecasted results" UI.

export interface SimulatorBaseline {
  currentConversionRate: number; // e.g. 0.0246 (2.46%)
  currentAOV: number; // average order value in $
}

export interface SimulatorInput {
  targetSessions: number;
}

export interface SimulatorResult {
  projectedConversions: number;
  projectedRevenue: number;
  confidence: "High" | "Medium" | "Low";
}

export function simulateGoal(baseline: SimulatorBaseline, input: SimulatorInput): SimulatorResult {
  const projectedConversions = Math.round(input.targetSessions * baseline.currentConversionRate);
  const projectedRevenue = Math.round(projectedConversions * baseline.currentAOV);

  // Confidence decreases the further the target is from typical current volume
  const confidence: SimulatorResult["confidence"] =
    input.targetSessions <= 150000 ? "High" : input.targetSessions <= 300000 ? "Medium" : "Low";

  return { projectedConversions, projectedRevenue, confidence };
}
