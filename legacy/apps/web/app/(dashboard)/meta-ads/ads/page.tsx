import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { metaAdsList } from "@/lib/mock-data/meta-ads";

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

export default function MetaAdsListPage() {
  return (
    <div>
      <TopBar subtitle="Individual ad performance across all ad sets." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Ad</th>
                <th className="pb-2 font-medium">Ad Set</th>
                <th className="pb-2 font-medium">Format</th>
                <th className="pb-2 font-medium">Conversions</th>
                <th className="pb-2 font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {metaAdsList.map((a) => (
                <tr key={a.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{a.name}</td>
                  <td className="py-2.5 text-neutral">{a.adSet}</td>
                  <td className="py-2.5"><Badge tone="neutral">{a.format}</Badge></td>
                  <td className="py-2.5 text-neutral">{a.conversions}</td>
                  <td className="py-2.5 font-medium text-success">{a.roas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
