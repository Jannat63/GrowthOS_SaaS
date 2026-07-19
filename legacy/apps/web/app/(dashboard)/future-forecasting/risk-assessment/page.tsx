import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { riskFactors } from "@/lib/mock-data/future-forecasting";

const tabs = [
  { label: "Overview", href: "/future-forecasting" },
  { label: "Forecast Models", href: "/future-forecasting/forecast-models" },
  { label: "Scenario Planner", href: "/future-forecasting/scenario-planner" },
  { label: "Growth Projections", href: "/future-forecasting/growth-projections" },
  { label: "Risk Assessment", href: "/future-forecasting/risk-assessment" },
  { label: "Goal Simulator", href: "/future-forecasting/goal-simulator" },
];

export default function RiskAssessmentPage() {
  return (
    <div>
      <TopBar subtitle="Factors that could affect your forecast accuracy." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {riskFactors.map((r) => (
          <Card key={r.risk} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium">{r.risk}</div>
              <div className="text-caption text-neutral">{r.desc}</div>
            </div>
            <Badge tone={r.level === "High" ? "danger" : r.level === "Medium" ? "warning" : "success"}>{r.level} Risk</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
