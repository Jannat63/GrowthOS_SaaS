import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { conversionActions } from "@/lib/mock-data/google-ads";

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

export default function ConversionTrackingPage() {
  return (
    <div>
      <TopBar subtitle="Conversion actions, values, and tracking source." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Conversion Action</th>
                <th className="pb-2 font-medium">Count</th>
                <th className="pb-2 font-medium">Value</th>
                <th className="pb-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {conversionActions.map((c) => (
                <tr key={c.action} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{c.action}</td>
                  <td className="py-2.5 text-neutral">{c.count}</td>
                  <td className="py-2.5 text-neutral">{c.value > 0 ? `$${c.value.toLocaleString()}` : "—"}</td>
                  <td className="py-2.5 text-neutral">{c.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
