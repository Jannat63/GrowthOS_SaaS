import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { bidBudget } from "@/lib/mock-data/google-ads";

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

export default function BidBudgetPage() {
  const pctSpent = Math.round((bidBudget.spent / bidBudget.totalBudget) * 100);
  return (
    <div>
      <TopBar subtitle="Budget pacing and bidding strategy across campaigns." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Budget" value={`$${bidBudget.totalBudget.toLocaleString()}`} />
          <StatCard label="Spent" value={`$${bidBudget.spent.toLocaleString()}`} />
          <StatCard label="Remaining" value={`$${bidBudget.remaining.toLocaleString()}`} />
          <StatCard label="Target CPA" value={`$${bidBudget.targetCPA.toFixed(2)}`} />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="text-heading-2">Monthly Pacing</div>
            <span className="text-small text-neutral">{pctSpent}% spent</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-6">
            <div className="h-full bg-primary" style={{ width: `${pctSpent}%` }} />
          </div>

          <div className="text-heading-2 mb-3">Campaign Budgets</div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium">Budget</th>
                <th className="pb-2 font-medium">Spent</th>
                <th className="pb-2 font-medium">Strategy</th>
              </tr>
            </thead>
            <tbody>
              {bidBudget.campaigns.map((c) => (
                <tr key={c.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-neutral">${c.budget.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">${c.spent.toLocaleString()}</td>
                  <td className="py-2.5"><Badge tone="primary">{c.strategy}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
