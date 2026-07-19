"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { simulateGoal } from "@/lib/logic/goal-simulator";
import { Badge } from "@/components/ui/Badge";

const baseline = { currentConversionRate: 0.0246, currentAOV: 68.9 };

const tabs = [
  { label: "Overview", href: "/future-forecasting" },
  { label: "Forecast Models", href: "/future-forecasting/forecast-models" },
  { label: "Scenario Planner", href: "/future-forecasting/scenario-planner" },
  { label: "Growth Projections", href: "/future-forecasting/growth-projections" },
  { label: "Risk Assessment", href: "/future-forecasting/risk-assessment" },
  { label: "Goal Simulator", href: "/future-forecasting/goal-simulator" },
];

export default function FutureForecastingPage() {
  const [targetSessions, setTargetSessions] = useState(128560);
  const result = simulateGoal(baseline, { targetSessions });

  return (
    <div>
      <TopBar subtitle="Predict future performance and plan data-driven growth strategies." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Forecasted Sessions (30d)" value="128,560" change="+28.6%" />
          <StatCard label="Forecasted Conversions (30d)" value="3,650" change="+31.4%" />
          <StatCard label="Forecasted Revenue" value="$78,450" change="+29.6%" />
          <StatCard label="Forecast Confidence" value="87%" change="High" />
        </div>

        <Card>
          <div className="text-heading-2 mb-1">Goal Simulator</div>
          <p className="text-caption text-neutral mb-4">
            Real projection: target sessions × current conversion rate ({(baseline.currentConversionRate * 100).toFixed(2)}%) × AOV (${baseline.currentAOV})
          </p>

          <label className="text-small text-neutral">Target Sessions: {targetSessions.toLocaleString()}</label>
          <input
            type="range"
            min={50000}
            max={500000}
            step={5000}
            value={targetSessions}
            onChange={(e) => setTargetSessions(Number(e.target.value))}
            className="w-full accent-primary mt-1"
          />

          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-caption text-neutral">Projected Conversions</div>
              <div className="text-heading-1">{result.projectedConversions.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-caption text-neutral">Projected Revenue</div>
              <div className="text-heading-1 text-success">${result.projectedRevenue.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-caption text-neutral">Confidence</div>
              <div className="mt-1">
                <Badge tone={result.confidence === "High" ? "success" : result.confidence === "Medium" ? "warning" : "danger"}>
                  {result.confidence}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
