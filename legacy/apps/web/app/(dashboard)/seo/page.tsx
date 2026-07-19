import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { seoStats } from "@/lib/mock-data/seo";
import { scoreKeywords } from "@/lib/logic/seo-scoring";
import { rawKeywords } from "@/lib/mock-data/seo";

const tabs = [
  { label: "Overview", href: "/seo" },
  { label: "Keyword Explorer", href: "/seo/keyword-explorer" },
  { label: "Rank Tracker", href: "/seo/rank-tracker" },
  { label: "Site Audit", href: "/seo/site-audit" },
  { label: "Content Studio", href: "/seo/content-studio" },
  { label: "Technical SEO", href: "/seo/technical-seo" },
  { label: "Backlinks", href: "/seo/backlinks" },
  { label: "AI Citations", href: "/seo/ai-citations" },
];

export default function SEOOverviewPage() {
  const topOpportunities = scoreKeywords(rawKeywords).slice(0, 5);

  return (
    <div>
      <TopBar subtitle="Everything you need to improve rankings and grow organic performance." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Organic Traffic" value={seoStats.organicTraffic.value} change={seoStats.organicTraffic.change} />
          <StatCard label="Organic Keywords" value={seoStats.organicKeywords.value} change={seoStats.organicKeywords.change} />
          <StatCard label="Keywords in Top 3" value={seoStats.keywordsInTop3.value} change={seoStats.keywordsInTop3.change} />
          <StatCard label="Backlinks" value={seoStats.backlinks.value} change={seoStats.backlinks.change} />
          <StatCard label="Domain Rating" value={seoStats.domainRating.value} change={seoStats.domainRating.change} />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-heading-2">Top SEO Opportunities</div>
            <Link href="/seo/keyword-explorer" className="text-small text-primary">View Keyword Explorer →</Link>
          </div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium">Position</th>
                <th className="pb-2 font-medium">Opportunity Score</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {topOpportunities.map((k) => (
                <tr key={k.keyword} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">{k.keyword}</td>
                  <td className="py-2.5 text-neutral">{k.currentPosition ?? "Not ranking"}</td>
                  <td className="py-2.5 font-medium">{k.opportunityScore}/100</td>
                  <td className="py-2.5">
                    <Badge tone={k.label === "Paid-Proven, Organic Needed" ? "primary" : k.label === "High Priority" ? "success" : "neutral"}>
                      {k.label}
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
