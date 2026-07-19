import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { contentIntelligence } from "@/lib/mock-data/growth-hub";

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

export default function ContentIntelligencePage() {
  return (
    <div>
      <TopBar subtitle="AI analysis of your content performance by topic." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card className="flex flex-col items-center justify-center py-8">
          <div className="text-display-1 text-success">{contentIntelligence.score}</div>
          <div className="text-small text-neutral">Content Score</div>
        </Card>
        <Card>
          <div className="text-heading-2 mb-4">Top Performing Topics</div>
          <div className="space-y-3">
            {contentIntelligence.topTopics.map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="w-40 text-body">{t.topic}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${t.performance}%` }} />
                </div>
                <span className="text-small font-medium w-10 text-right">{t.performance}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
