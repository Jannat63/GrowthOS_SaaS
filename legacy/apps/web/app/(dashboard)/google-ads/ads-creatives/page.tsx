import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { adCreatives } from "@/lib/mock-data/google-ads";

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

const strengthTone: Record<string, "success" | "warning" | "neutral"> = { Excellent: "success", Good: "success", Average: "warning" };

export default function AdsCreativesPage() {
  return (
    <div>
      <TopBar subtitle="Responsive Search Ad headlines, descriptions, and Ad Strength." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {adCreatives.map((a) => (
          <Card key={a.headline} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium mb-1">{a.headline}</div>
              <Badge tone="neutral">{a.type}</Badge>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-caption text-neutral">CTR</div>
                <div className="text-heading-2">{a.ctr}%</div>
              </div>
              <Badge tone={strengthTone[a.adStrength]}>{a.adStrength}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
