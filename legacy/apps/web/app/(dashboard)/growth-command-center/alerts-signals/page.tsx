import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { alertsSignals } from "@/lib/mock-data/growth-command-center";

const tabs = [
  { label: "Overview", href: "/growth-command-center" },
  { label: "Growth Strategy", href: "/growth-command-center/growth-strategy" },
  { label: "Forecasting", href: "/growth-command-center/forecasting" },
  { label: "Scenario Planner", href: "/growth-command-center/scenario-planner" },
  { label: "Resource Allocation", href: "/growth-command-center/resource-allocation" },
  { label: "OKR Tracking", href: "/growth-command-center/okr-tracking" },
  { label: "Alerts & Signals", href: "/growth-command-center/alerts-signals" },
];

export default function AlertsSignalsPage() {
  return (
    <div>
      <TopBar subtitle="Real-time signals across all channels." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {alertsSignals.map((a, i) => (
          <Card key={i} className="flex items-center justify-between">
            <div className="text-body">{a.signal}</div>
            <div className="flex items-center gap-3">
              <Badge tone={a.type === "Growth" ? "success" : "warning"}>{a.type}</Badge>
              <span className="text-caption text-neutral">{a.time}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
