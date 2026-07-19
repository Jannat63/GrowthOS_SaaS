import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { keywordsList } from "@/lib/mock-data/google-ads";

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

export default function KeywordsPage() {
  return (
    <div>
      <TopBar subtitle="Keyword-level performance and cost efficiency." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium">Match Type</th>
                <th className="pb-2 font-medium">Clicks</th>
                <th className="pb-2 font-medium">Cost</th>
                <th className="pb-2 font-medium">Conversions</th>
                <th className="pb-2 font-medium">Cost/Conv.</th>
              </tr>
            </thead>
            <tbody>
              {keywordsList.map((k) => (
                <tr key={k.keyword} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{k.keyword}</td>
                  <td className="py-2.5"><Badge tone="neutral">{k.matchType}</Badge></td>
                  <td className="py-2.5 text-neutral">{k.clicks.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">${k.cost.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">{k.conversions}</td>
                  <td className="py-2.5 font-medium">${k.costPerConv.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
