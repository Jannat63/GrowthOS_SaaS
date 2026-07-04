import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { optimizationRecommendations } from "@/lib/mock-data/optimization-engine";

const tabs = [
  { label: "Overview", href: "/optimization-engine" },
  { label: "Recommendations", href: "/optimization-engine/recommendations" },
  { label: "A/B Testing", href: "/optimization-engine/ab-testing" },
  { label: "Automations", href: "/optimization-engine/automations" },
  { label: "Performance Boosters", href: "/optimization-engine/performance-boosters" },
];

export default function OptimizationRecommendationsPage() {
  return (
    <div>
      <TopBar subtitle="AI-generated optimization actions across every channel." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {optimizationRecommendations.map((r) => (
          <Card key={r.title} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium">{r.title}</div>
              <div className="text-caption text-neutral">{r.desc}</div>
            </div>
            <Badge tone={r.impact === "High" ? "success" : r.impact === "Medium" ? "warning" : "neutral"}>{r.impact} Impact</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
