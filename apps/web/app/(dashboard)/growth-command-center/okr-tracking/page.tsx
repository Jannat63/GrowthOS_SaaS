import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { okrs } from "@/lib/mock-data/growth-command-center";

const tabs = [
  { label: "Overview", href: "/growth-command-center" },
  { label: "Growth Strategy", href: "/growth-command-center/growth-strategy" },
  { label: "Forecasting", href: "/growth-command-center/forecasting" },
  { label: "Scenario Planner", href: "/growth-command-center/scenario-planner" },
  { label: "Resource Allocation", href: "/growth-command-center/resource-allocation" },
  { label: "OKR Tracking", href: "/growth-command-center/okr-tracking" },
  { label: "Alerts & Signals", href: "/growth-command-center/alerts-signals" },
];

export default function OKRTrackingPage() {
  return (
    <div>
      <TopBar subtitle="Objectives and Key Results for this quarter." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-4">
        {okrs.map((o) => (
          <Card key={o.objective}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-heading-2">{o.objective}</div>
              <span className="text-small font-medium text-primary">{o.progress}%</span>
            </div>
            <ul className="space-y-1 mb-3">
              {o.keyResults.map((kr) => <li key={kr} className="text-body text-neutral">• {kr}</li>)}
            </ul>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${o.progress}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
