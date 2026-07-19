import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { googleAdsStats, campaigns, searchTerms } from "@/lib/mock-data/google-ads";
import { analyzeSearchTerms } from "@/lib/logic/search-terms-bridge";

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

export default function GoogleAdsOverviewPage() {
  const analyzed = analyzeSearchTerms(searchTerms);

  return (
    <div>
      <TopBar subtitle="Manage, optimize, and scale your Google Ads campaigns." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Clicks" value={googleAdsStats.clicks.value} change={googleAdsStats.clicks.change} />
          <StatCard label="Impressions" value={googleAdsStats.impressions.value} change={googleAdsStats.impressions.change} />
          <StatCard label="Cost" value={googleAdsStats.cost.value} change={googleAdsStats.cost.change} changeDirection="down" />
          <StatCard label="Conversions" value={googleAdsStats.conversions.value} change={googleAdsStats.conversions.change} />
          <StatCard label="Cost / Conv." value={googleAdsStats.costPerConv.value} change={googleAdsStats.costPerConv.change} changeDirection="down" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="text-heading-2 mb-4">Campaign Performance</div>
            <table className="w-full text-body">
              <thead>
                <tr className="text-caption text-neutral text-left border-b border-slate-100">
                  <th className="pb-2 font-medium">Campaign</th>
                  <th className="pb-2 font-medium">Clicks</th>
                  <th className="pb-2 font-medium">Cost</th>
                  <th className="pb-2 font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.name} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5">{c.name}</td>
                    <td className="py-2.5 text-neutral">{c.clicks.toLocaleString()}</td>
                    <td className="py-2.5 text-neutral">${c.cost.toLocaleString()}</td>
                    <td className="py-2.5 font-medium text-success">{c.roas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <div className="text-heading-2 mb-1">Search Terms Intelligence</div>
            <p className="text-caption text-neutral mb-4">Live bridge rule: flags paid-proven / organic-needed terms automatically.</p>
            <div className="space-y-3">
              {analyzed.map((t) => (
                <div key={t.term} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body font-medium">{t.term}</span>
                    <Badge
                      tone={
                        t.recommendation.type === "paid-proven-organic-needed"
                          ? "primary"
                          : t.recommendation.type === "reduce-bid-organic-covers"
                          ? "warning"
                          : "neutral"
                      }
                    >
                      {t.recommendation.type === "paid-proven-organic-needed"
                        ? "SEO Opportunity"
                        : t.recommendation.type === "reduce-bid-organic-covers"
                        ? "Reduce Bid"
                        : "Monitor"}
                    </Badge>
                  </div>
                  <p className="text-caption text-neutral">{t.recommendation.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
