import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { FileText } from "lucide-react";
import { aiReportsList } from "@/lib/mock-data/growth-hub";

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

export default function AIReportsPage() {
  return (
    <div>
      <TopBar subtitle="AI-generated weekly Growth Intelligence Reports." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {aiReportsList.map((r, i) => (
          <Card key={i} className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="text-body font-medium">{r.title}</div>
              <div className="text-caption text-neutral mb-1">{r.date}</div>
              <p className="text-body text-neutral">{r.summary}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
