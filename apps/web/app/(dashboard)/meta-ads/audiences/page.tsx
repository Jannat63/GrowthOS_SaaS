import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { metaAudiences } from "@/lib/mock-data/meta-ads";

const tabs = [
  { label: "Overview", href: "/meta-ads" },
  { label: "Campaigns", href: "/meta-ads/campaigns" },
  { label: "Ad Sets", href: "/meta-ads/ad-sets" },
  { label: "Ads", href: "/meta-ads/ads" },
  { label: "Audiences", href: "/meta-ads/audiences" },
  { label: "Placements", href: "/meta-ads/placements" },
  { label: "Creative Library", href: "/meta-ads/creative-library" },
  { label: "A/B Tests", href: "/meta-ads/ab-tests" },
  { label: "Budget & Bidding", href: "/meta-ads/budget-bidding" },
  { label: "Conversion Tracking", href: "/meta-ads/conversion-tracking" },
];

export default function AudiencesPage() {
  return (
    <div>
      <TopBar subtitle="Custom Audiences, Lookalikes, and engagement segments." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {metaAudiences.map((a) => (
          <Card key={a.name} className="flex items-center justify-between">
            <div className="text-body font-medium">{a.name}</div>
            <div className="flex items-center gap-4">
              <span className="text-small text-neutral">{a.size} people</span>
              <Badge tone="primary">{a.type}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
