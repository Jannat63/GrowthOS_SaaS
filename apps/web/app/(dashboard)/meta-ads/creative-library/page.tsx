"use client";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { metaCreativeLibrary } from "@/lib/mock-data/meta-ads";

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

const fatigueTone: Record<string, "danger" | "warning" | "success"> = { Fatigued: "danger", "At Risk": "warning", Healthy: "success" };

export default function CreativeLibraryPage() {
  return (
    <div>
      <TopBar subtitle="All creative assets with real fatigue status from the Creative Fatigue Detector." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-2 gap-4">
        {metaCreativeLibrary.map((c) => (
          <Card key={c.name}>
            <div className="flex items-center justify-between mb-2">
              <Badge tone="neutral">{c.format}</Badge>
              <Badge tone={fatigueTone[c.fatigueStatus]}>{c.fatigueStatus}</Badge>
            </div>
            <div className="text-heading-2 mb-1">{c.name}</div>
            <div className="flex justify-between text-body">
              <span className="text-neutral">{c.conversions} conversions</span>
              <span className="font-medium text-success">{c.roas} ROAS</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
