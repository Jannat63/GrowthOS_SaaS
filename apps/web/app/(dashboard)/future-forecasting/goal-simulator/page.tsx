"use client";
import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { simulateGoal } from "@/lib/logic/goal-simulator";

const tabs = [
  { label: "Overview", href: "/future-forecasting" },
  { label: "Forecast Models", href: "/future-forecasting/forecast-models" },
  { label: "Scenario Planner", href: "/future-forecasting/scenario-planner" },
  { label: "Growth Projections", href: "/future-forecasting/growth-projections" },
  { label: "Risk Assessment", href: "/future-forecasting/risk-assessment" },
  { label: "Goal Simulator", href: "/future-forecasting/goal-simulator" },
];

const baseline = { currentConversionRate: 0.0246, currentAOV: 68.9 };

export default function GoalSimulatorPage() {
  const [targetSessions, setTargetSessions] = useState(400000);
  const result = simulateGoal(baseline, { targetSessions });

  return (
    <div>
      <TopBar subtitle="Adjust targets and see real projected results — live calculation, not mock data." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <div className="text-heading-2 mb-4">Target Sessions</div>
          <input
            type="range"
            min={100000}
            max={600000}
            step={10000}
            value={targetSessions}
            onChange={(e) => setTargetSessions(Number(e.target.value))}
            className="w-full mb-2"
          />
          <div className="text-display-2 mb-6">{targetSessions.toLocaleString()}</div>

          <div className="grid grid-cols-3 gap-4">
            <div className="border border-slate-100 rounded-lg p-4">
              <div className="text-caption text-neutral">Projected Conversions</div>
              <div className="text-heading-1">{result.projectedConversions.toLocaleString()}</div>
            </div>
            <div className="border border-slate-100 rounded-lg p-4">
              <div className="text-caption text-neutral">Projected Revenue</div>
              <div className="text-heading-1 text-success">${result.projectedRevenue.toLocaleString()}</div>
            </div>
            <div className="border border-slate-100 rounded-lg p-4">
              <div className="text-caption text-neutral mb-1">Confidence</div>
              <Badge tone={result.confidence === "High" ? "success" : result.confidence === "Medium" ? "warning" : "danger"}>
                {result.confidence}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
