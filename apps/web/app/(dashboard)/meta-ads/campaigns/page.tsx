import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { metaCampaigns } from "@/lib/mock-data/meta-ads";

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

export default function MetaCampaignsPage() {
  return (
    <div>
      <TopBar subtitle="All Meta campaigns across Facebook and Instagram." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium">Objective</th>
                <th className="pb-2 font-medium">Results</th>
                <th className="pb-2 font-medium">Cost</th>
                <th className="pb-2 font-medium">ROAS</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {metaCampaigns.map((c) => (
                <tr key={c.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{c.name}</td>
                  <td className="py-2.5 text-neutral">{c.objective}</td>
                  <td className="py-2.5 text-neutral">{c.results.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">${c.cost.toLocaleString()}</td>
                  <td className="py-2.5 font-medium text-success">{c.roas}</td>
                  <td className="py-2.5"><Badge tone={c.status === "Active" ? "success" : "neutral"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
