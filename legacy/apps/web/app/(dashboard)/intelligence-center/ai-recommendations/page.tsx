import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { aiRecommendationsList } from "@/lib/mock-data/growth-hub";

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

export default function AIRecommendationsPage() {
  return (
    <div>
      <TopBar subtitle="All AI-generated recommendations across every channel." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {aiRecommendationsList.map((r) => (
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
