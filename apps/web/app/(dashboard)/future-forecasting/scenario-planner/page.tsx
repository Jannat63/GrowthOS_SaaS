import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { ffScenarios } from "@/lib/mock-data/future-forecasting";

const tabs = [
  { label: "Overview", href: "/future-forecasting" },
  { label: "Forecast Models", href: "/future-forecasting/forecast-models" },
  { label: "Scenario Planner", href: "/future-forecasting/scenario-planner" },
  { label: "Growth Projections", href: "/future-forecasting/growth-projections" },
  { label: "Risk Assessment", href: "/future-forecasting/risk-assessment" },
  { label: "Goal Simulator", href: "/future-forecasting/goal-simulator" },
];

export default function FFScenarioPlannerPage() {
  return (
    <div>
      <TopBar subtitle="Compare projected outcomes across scenarios." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-3 gap-4">
        {ffScenarios.map((s) => (
          <Card key={s.name}>
            <div className="text-heading-2 mb-3">{s.name}</div>
            <div className="text-caption text-neutral">Sessions</div>
            <div className="text-heading-1 mb-2">{s.sessions}</div>
            <div className="text-caption text-neutral">Revenue</div>
            <div className="text-heading-1 mb-2">{s.revenue}</div>
            <div className="text-caption text-neutral">ROAS</div>
            <div className="text-heading-1 text-success">{s.roas}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
