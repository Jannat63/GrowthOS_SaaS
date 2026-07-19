import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { forecastModels } from "@/lib/mock-data/future-forecasting";

const tabs = [
  { label: "Overview", href: "/future-forecasting" },
  { label: "Forecast Models", href: "/future-forecasting/forecast-models" },
  { label: "Scenario Planner", href: "/future-forecasting/scenario-planner" },
  { label: "Growth Projections", href: "/future-forecasting/growth-projections" },
  { label: "Risk Assessment", href: "/future-forecasting/risk-assessment" },
  { label: "Goal Simulator", href: "/future-forecasting/goal-simulator" },
];

export default function ForecastModelsPage() {
  return (
    <div>
      <TopBar subtitle="Models powering every forecast across the platform." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-3 gap-4">
        {forecastModels.map((m) => (
          <Card key={m.model}>
            <div className="text-heading-2 mb-1">{m.model}</div>
            <div className="text-caption text-neutral mb-3">{m.method}</div>
            <div className="text-display-2 text-success">{m.accuracy}%</div>
            <div className="text-caption text-neutral">Accuracy</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
