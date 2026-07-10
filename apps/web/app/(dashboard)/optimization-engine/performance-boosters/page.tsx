import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { performanceBoosters } from "@/lib/mock-data/optimization-engine";

const tabs = [
  { label: "Overview", href: "/optimization-engine" },
  { label: "Recommendations", href: "/optimization-engine/recommendations" },
  { label: "A/B Testing", href: "/optimization-engine/ab-testing" },
  { label: "Automations", href: "/optimization-engine/automations" },
  { label: "Performance Boosters", href: "/optimization-engine/performance-boosters" },
];

export default function PerformanceBoostersPage() {
  return (
    <div>
      <TopBar subtitle="Quick wins ranked by impact and effort." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {performanceBoosters.map((p) => (
          <Card key={p.title} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium">{p.title}</div>
              <div className="text-caption text-neutral">ETA: {p.eta}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={p.impact === "High" ? "success" : "warning"}>{p.impact} Impact</Badge>
              <Button size="sm">Execute</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
