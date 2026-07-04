import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { metaAdsStats, creatives } from "@/lib/mock-data/meta-ads";
import { detectFatigueAll } from "@/lib/logic/creative-fatigue";

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

export default function MetaAdsOverviewPage() {
  const fatigueResults = detectFatigueAll(creatives);

  return (
    <div>
      <TopBar subtitle="Manage and optimize your Facebook & Instagram ad campaigns." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Results (Conversions)" value={metaAdsStats.results.value} change={metaAdsStats.results.change} />
          <StatCard label="Reach" value={metaAdsStats.reach.value} change={metaAdsStats.reach.change} />
          <StatCard label="Amount Spent" value={metaAdsStats.amountSpent.value} change={metaAdsStats.amountSpent.change} changeDirection="down" />
          <StatCard label="Purchase ROAS" value={metaAdsStats.purchaseROAS.value} change={metaAdsStats.purchaseROAS.change} />
        </div>

        <Card>
          <div className="text-heading-2 mb-1">Creative Fatigue Detector</div>
          <p className="text-caption text-neutral mb-4">Live rule: frequency &gt; 3 AND CTR down &gt; 20% week-over-week = fatigued.</p>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Creative</th>
                <th className="pb-2 font-medium">Frequency</th>
                <th className="pb-2 font-medium">CTR This Week</th>
                <th className="pb-2 font-medium">CTR Change</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {fatigueResults.map((c) => (
                <tr key={c.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-neutral">{c.frequency.toFixed(1)}</td>
                  <td className="py-2.5 text-neutral">{c.ctrThisWeek.toFixed(1)}%</td>
                  <td className="py-2.5 text-danger">-{c.ctrDeclinePercent.toFixed(0)}%</td>
                  <td className="py-2.5">
                    <Badge tone={c.status === "fatigued" ? "danger" : c.status === "at-risk" ? "warning" : "success"}>
                      {c.status === "fatigued" ? "Fatigued — Refresh" : c.status === "at-risk" ? "At Risk" : "Healthy"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
