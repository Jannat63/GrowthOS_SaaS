import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { predictiveAnalytics } from "@/lib/mock-data/growth-hub";

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

export default function PredictiveAnalyticsPage() {
  return (
    <div>
      <TopBar subtitle="AI-predicted performance vs actual, updated daily." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-3 gap-4">
        {predictiveAnalytics.map((p) => (
          <Card key={p.channel}>
            <div className="text-heading-2 mb-3">{p.channel}</div>
            {"predictedTraffic" in p && (
              <>
                <div className="text-caption text-neutral">Predicted Traffic</div>
                <div className="text-display-2 mb-2">{p.predictedTraffic.toLocaleString()}</div>
                <div className="text-caption text-neutral">Actual: {p.actualTraffic.toLocaleString()}</div>
              </>
            )}
            {"predictedConversions" in p && (
              <>
                <div className="text-caption text-neutral">Predicted Conversions</div>
                <div className="text-display-2 mb-2">{p.predictedConversions.toLocaleString()}</div>
                <div className="text-caption text-neutral">Actual: {p.actualConversions.toLocaleString()}</div>
              </>
            )}
            {"predictedROAS" in p && (
              <>
                <div className="text-caption text-neutral">Predicted ROAS</div>
                <div className="text-display-2 mb-2">{p.predictedROAS}x</div>
                <div className="text-caption text-neutral">Actual: {p.actualROAS}x</div>
              </>
            )}
            <div className="mt-3 text-small text-primary font-medium">{p.confidence}% confidence</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
