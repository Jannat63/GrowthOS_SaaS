import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { backlinkProfile } from "@/lib/mock-data/seo";

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

export default function BacklinksPage() {
  return (
    <div>
      <TopBar subtitle="Backlink profile, referring domains, and link building opportunities." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Referring Domains" value={backlinkProfile.totalReferringDomains.toLocaleString()} />
          <StatCard label="Total Backlinks" value={backlinkProfile.totalBacklinks.toLocaleString()} />
          <StatCard label="Domain Rating" value={String(backlinkProfile.domainRating)} />
          <StatCard label="New Links (30d)" value={String(backlinkProfile.newLinks30d)} change={`-${backlinkProfile.lostLinks30d} lost`} changeDirection="down" />
        </div>

        <Card>
          <div className="text-heading-2 mb-4">Top Referring Domains</div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Domain</th>
                <th className="pb-2 font-medium">Authority</th>
                <th className="pb-2 font-medium">Links</th>
                <th className="pb-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {backlinkProfile.topReferringDomains.map((d) => (
                <tr key={d.domain} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{d.domain}</td>
                  <td className="py-2.5 text-neutral">{d.authority}</td>
                  <td className="py-2.5 text-neutral">{d.links}</td>
                  <td className="py-2.5"><Badge tone="neutral">{d.type}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
