import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { campaigns } from "@/lib/mock-data/google-ads";

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

export default function CampaignsPage() {
  return (
    <div>
      <TopBar subtitle="All Google Ads campaigns across Search, Shopping, Display, and Demand Gen." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium">Clicks</th>
                <th className="pb-2 font-medium">Cost</th>
                <th className="pb-2 font-medium">Conversions</th>
                <th className="pb-2 font-medium">ROAS</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-neutral">{c.clicks.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">${c.cost.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">{c.conversions}</td>
                  <td className="py-2.5 font-medium text-success">{c.roas}</td>
                  <td className="py-2.5"><Badge tone={c.status === "Enabled" ? "success" : "neutral"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
