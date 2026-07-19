import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { scenarios } from "@/lib/mock-data/growth-command-center";

const tabs = [
  { label: "Overview", href: "/growth-command-center" },
  { label: "Growth Strategy", href: "/growth-command-center/growth-strategy" },
  { label: "Forecasting", href: "/growth-command-center/forecasting" },
  { label: "Scenario Planner", href: "/growth-command-center/scenario-planner" },
  { label: "Resource Allocation", href: "/growth-command-center/resource-allocation" },
  { label: "OKR Tracking", href: "/growth-command-center/okr-tracking" },
  { label: "Alerts & Signals", href: "/growth-command-center/alerts-signals" },
];

export default function ScenarioPlannerPage() {
  return (
    <div>
      <TopBar subtitle="Compare best case, most likely, and worst case outcomes." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <Card key={s.name}>
            <div className="text-heading-2 mb-3">{s.name}</div>
            <div className="text-caption text-neutral">Sessions</div>
            <div className="text-heading-1 mb-2">{s.sessions.toLocaleString()}</div>
            <div className="text-caption text-neutral">Revenue</div>
            <div className="text-heading-1 mb-2">${s.revenue.toLocaleString()}</div>
            <div className="text-caption text-neutral">ROAS</div>
            <div className="text-heading-1 text-success">{s.roas}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
