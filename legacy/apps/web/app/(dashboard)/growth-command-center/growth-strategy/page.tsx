import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { growthStrategyGoals } from "@/lib/mock-data/growth-command-center";

const tabs = [
  { label: "Overview", href: "/growth-command-center" },
  { label: "Growth Strategy", href: "/growth-command-center/growth-strategy" },
  { label: "Forecasting", href: "/growth-command-center/forecasting" },
  { label: "Scenario Planner", href: "/growth-command-center/scenario-planner" },
  { label: "Resource Allocation", href: "/growth-command-center/resource-allocation" },
  { label: "OKR Tracking", href: "/growth-command-center/okr-tracking" },
  { label: "Alerts & Signals", href: "/growth-command-center/alerts-signals" },
];

export default function GrowthStrategyPage() {
  return (
    <div>
      <TopBar subtitle="Strategic initiatives and quarterly goals." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-2 gap-4">
        {growthStrategyGoals.map((g) => (
          <Card key={g.name}>
            <div className="text-heading-2 mb-1">{g.name}</div>
            <p className="text-body text-neutral mb-3">{g.desc}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${g.progress}%` }} />
              </div>
              <span className="text-small font-medium">{g.progress}%</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
