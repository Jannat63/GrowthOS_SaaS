import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { rankTrackerKeywords } from "@/lib/mock-data/seo";

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

export default function RankTrackerPage() {
  return (
    <div>
      <TopBar subtitle="Daily keyword position tracking across desktop and mobile." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <div className="text-heading-2 mb-4">Tracked Keywords</div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium">Position</th>
                <th className="pb-2 font-medium">Change (24h)</th>
                <th className="pb-2 font-medium">Volume</th>
                <th className="pb-2 font-medium">Ranking URL</th>
                <th className="pb-2 font-medium">SERP Feature</th>
              </tr>
            </thead>
            <tbody>
              {rankTrackerKeywords.map((k) => (
                <tr key={k.keyword} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{k.keyword}</td>
                  <td className="py-2.5">{k.position}</td>
                  <td className="py-2.5">
                    <span className={k.change > 0 ? "text-success" : k.change < 0 ? "text-danger" : "text-neutral"}>
                      {k.change > 0 ? `↑ ${k.change}` : k.change < 0 ? `↓ ${Math.abs(k.change)}` : "—"}
                    </span>
                  </td>
                  <td className="py-2.5 text-neutral">{k.volume.toLocaleString()}</td>
                  <td className="py-2.5 text-neutral">{k.url}</td>
                  <td className="py-2.5">
                    {k.serpFeature ? <Badge tone="primary">{k.serpFeature}</Badge> : <span className="text-neutral">—</span>}
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
