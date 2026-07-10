import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { metaBudgetBidding } from "@/lib/mock-data/meta-ads";

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

export default function MetaBudgetBiddingPage() {
  const pctSpent = Math.round((metaBudgetBidding.spent / metaBudgetBidding.totalBudget) * 100);
  return (
    <div>
      <TopBar subtitle="Budget pacing across active campaigns." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Budget" value={`$${metaBudgetBidding.totalBudget.toLocaleString()}`} />
          <StatCard label="Spent" value={`$${metaBudgetBidding.spent.toLocaleString()}`} />
          <StatCard label="Remaining" value={`$${metaBudgetBidding.remaining.toLocaleString()}`} />
        </div>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="text-heading-2">Pacing</div>
            <span className="text-small text-neutral">{pctSpent}% spent</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-6">
            <div className="h-full bg-primary" style={{ width: `${pctSpent}%` }} />
          </div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium">Budget</th>
                <th className="pb-2 font-medium">Spent</th>
              </tr>
            </thead>
            <tbody>
              {metaBudgetBidding.campaigns.map((c) => (
                <tr key={c.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-neutral">${c.budget.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">${c.spent.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
