import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { metaAdSets } from "@/lib/mock-data/meta-ads";

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

export default function AdSetsPage() {
  return (
    <div>
      <TopBar subtitle="Ad set targeting, budget, and cost efficiency." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Ad Set</th>
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium">Results</th>
                <th className="pb-2 font-medium">Cost/Result</th>
                <th className="pb-2 font-medium">Budget</th>
              </tr>
            </thead>
            <tbody>
              {metaAdSets.map((a) => (
                <tr key={a.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{a.name}</td>
                  <td className="py-2.5 text-neutral">{a.campaign}</td>
                  <td className="py-2.5 text-neutral">{a.results}</td>
                  <td className="py-2.5 text-neutral">${a.costPerResult.toFixed(2)}</td>
                  <td className="py-2.5 text-neutral">${a.budget.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
