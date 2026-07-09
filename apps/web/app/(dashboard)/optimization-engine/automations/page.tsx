import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { automationsList } from "@/lib/mock-data/optimization-engine";

const tabs = [
  { label: "Overview", href: "/optimization-engine" },
  { label: "Recommendations", href: "/optimization-engine/recommendations" },
  { label: "A/B Testing", href: "/optimization-engine/ab-testing" },
  { label: "Automations", href: "/optimization-engine/automations" },
  { label: "Performance Boosters", href: "/optimization-engine/performance-boosters" },
];

export default function AutomationsPage() {
  return (
    <div>
      <TopBar subtitle="Rules running automatically to optimize performance." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {automationsList.map((a) => (
          <Card key={a.name} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium">{a.name}</div>
              <div className="text-caption text-neutral">{a.type}</div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-small text-neutral">{a.actionsThisWeek} actions this week</span>
              <Badge tone={a.active ? "success" : "neutral"}>{a.active ? "Active" : "Paused"}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
