import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { audienceInsights } from "@/lib/mock-data/google-ads";

const tabs = [
  { label: "Overview", href: "/google-ads" },
  { label: "Campaigns", href: "/google-ads/campaigns" },
  { label: "Ad Groups", href: "/google-ads/ad-groups" },
  { label: "Keywords", href: "/google-ads/keywords" },
  { label: "Ads & Creatives", href: "/google-ads/ads-creatives" },
  { label: "Search Terms", href: "/google-ads/search-terms" },
  { label: "Placements", href: "/google-ads/placements" },
  { label: "Audience Insights", href: "/google-ads/audience-insights" },
  { label: "Bid & Budget", href: "/google-ads/bid-budget" },
  { label: "Conversion Tracking", href: "/google-ads/conversion-tracking" },
];

export default function AudienceInsightsPage() {
  return (
    <div>
      <TopBar subtitle="Audience segments driving conversions across your campaigns." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {audienceInsights.map((a) => (
          <Card key={a.segment} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium">{a.segment}</div>
              <div className="text-caption text-neutral">Audience size: {a.size}</div>
            </div>
            <div className="flex items-center gap-6">
              <Badge tone={a.affinity === "Very High" || a.affinity === "High" ? "success" : "neutral"}>{a.affinity} Affinity</Badge>
              <div className="text-right">
                <div className="text-caption text-neutral">Conversions</div>
                <div className="text-heading-2">{a.conversions}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
