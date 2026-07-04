import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle } from "lucide-react";
import { anomalies } from "@/lib/mock-data/growth-hub";

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

export default function AnomalyDetectionPage() {
  return (
    <div>
      <TopBar subtitle="Unusual patterns automatically flagged across all channels." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {anomalies.map((a, i) => (
          <Card key={i} className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${a.severity === "Critical" ? "text-danger" : a.severity === "Warning" ? "text-warning" : "text-neutral"}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-body font-medium">{a.issue}</div>
                <Badge tone={a.severity === "Critical" ? "danger" : a.severity === "Warning" ? "warning" : "neutral"}>{a.severity}</Badge>
              </div>
              <div className="text-caption text-neutral">{a.detail} · {a.detected}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
