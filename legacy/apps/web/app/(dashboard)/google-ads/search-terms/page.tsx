"use client";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { searchTerms } from "@/lib/mock-data/google-ads";
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

export default function SearchTermsPage() {
  const analyzed = analyzeSearchTerms(searchTerms);
  return (
    <div>
      <TopBar subtitle="Every search query analyzed by the real Paid-to-Organic Bridge rule." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Search Term</th>
                <th className="pb-2 font-medium">Clicks</th>
                <th className="pb-2 font-medium">Conversions</th>
                <th className="pb-2 font-medium">Organic Position</th>
                <th className="pb-2 font-medium">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {analyzed.map((t) => (
                <tr key={t.term} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{t.term}</td>
                  <td className="py-2.5 text-neutral">{t.clicks}</td>
                  <td className="py-2.5 text-neutral">{t.conversions}</td>
                  <td className="py-2.5 text-neutral">{t.organicPosition ?? "Not ranking"}</td>
                  <td className="py-2.5">
                    <Badge tone={t.recommendation.type === "paid-proven-organic-needed" ? "primary" : t.recommendation.type === "reduce-bid-organic-covers" ? "warning" : "neutral"}>
                      {t.recommendation.type === "paid-proven-organic-needed" ? "SEO Opportunity" : t.recommendation.type === "reduce-bid-organic-covers" ? "Reduce Bid" : "Monitor"}
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
