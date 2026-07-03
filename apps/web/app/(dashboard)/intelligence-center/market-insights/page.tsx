import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendingUp } from "lucide-react";
import { marketInsights } from "@/lib/mock-data/growth-hub";

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

export default function MarketInsightsPage() {
  return (
    <div>
      <TopBar subtitle="Rising trends and related opportunities in your market." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        {marketInsights.map((m) => (
          <Card key={m.trend}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <span className="text-heading-1">{m.trend}</span>
              <Badge tone="success">{m.growth} search volume growth</Badge>
            </div>
            <div className="text-caption text-neutral mb-2">Related opportunities:</div>
            <div className="flex gap-2 flex-wrap">
              {m.related.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
