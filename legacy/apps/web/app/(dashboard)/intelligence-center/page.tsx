"use client";

import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { BrainCircuit, ArrowRight, Loader2 } from "lucide-react";
import { useCrossChannelRecommendations } from "@/lib/hooks/useCrossChannelRecommendations";

const bridgeLabels: Record<string, string> = {
  "SEO→GoogleAds": "SEO → Google Ads",
  "GoogleAds→SEO": "Google Ads → SEO",
  "Meta→SEO": "Meta Ads → SEO",
  "SEO→Meta": "SEO → Meta Ads",
};

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

export default function IntelligenceCenterPage() {
  const { data, isLoading } = useCrossChannelRecommendations();
  const recommendations = data?.data ?? [];

  return (
    <div>
      <TopBar subtitle="The Unified Intelligence Engine — reads all three channels and finds what no single-channel tool can see." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <span className="text-heading-2">Cross-Channel Recommendations</span>
            </div>
            <DataSourceBadge source={data?.source} />
          </div>
          <p className="text-body text-neutral">
            {isLoading
              ? "Analyzing SEO, Google Ads, and Meta data..."
              : `Generated from your actual SEO keyword data, Google Ads search terms, and Meta creative performance — ${recommendations.length} recommendations found this analysis run.`}
          </p>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge tone="primary">{bridgeLabels[r.bridge]}</Badge>
                      <Badge tone={r.impact === "High" ? "success" : r.impact === "Medium" ? "warning" : "neutral"}>
                        {r.impact} Impact
                      </Badge>
                    </div>
                    <div className="text-heading-2 mb-1">{r.title}</div>
                    <p className="text-body text-neutral">{r.message}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-neutral shrink-0 mt-1" />
                </div>
              </Card>
            ))}
            {recommendations.length === 0 && (
              <Card>
                <p className="text-body text-neutral">No cross-channel opportunities detected in the current data.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
