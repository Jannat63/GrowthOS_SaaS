import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { metaConversionTracking } from "@/lib/mock-data/meta-ads";

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

export default function MetaConversionTrackingPage() {
  return (
    <div>
      <TopBar subtitle="Pixel, Conversions API, and Event Match Quality status." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="text-caption text-neutral mb-1">Meta Pixel</div>
            <Badge tone="success">{metaConversionTracking.pixelStatus}</Badge>
          </Card>
          <Card>
            <div className="text-caption text-neutral mb-1">Conversions API</div>
            <Badge tone="success">{metaConversionTracking.capiStatus}</Badge>
          </Card>
          <Card>
            <div className="text-caption text-neutral mb-1">Event Match Quality</div>
            <div className="text-heading-1">{metaConversionTracking.eventMatchQuality}/10</div>
          </Card>
        </div>
        <Card>
          <div className="text-heading-2 mb-4">Tracked Events</div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Count</th>
                <th className="pb-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {metaConversionTracking.events.map((e) => (
                <tr key={e.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{e.name}</td>
                  <td className="py-2.5 text-neutral">{e.count.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">{e.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
