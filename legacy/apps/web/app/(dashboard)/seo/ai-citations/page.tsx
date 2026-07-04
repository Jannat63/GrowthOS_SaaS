import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { aiCitations } from "@/lib/mock-data/seo";

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

export default function AICitationsPage() {
  const citedCount = aiCitations.filter((c) => c.cited).length;

  return (
    <div>
      <TopBar subtitle="GEO tracking — how often your brand is cited in AI answer engines." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card className="bg-primary/[0.03] border-primary/20">
          <div className="text-heading-2 mb-1">{citedCount} of {aiCitations.length} tracked keywords are cited by AI systems</div>
          <p className="text-body text-neutral">Monitored across ChatGPT, Perplexity, Google AI Overviews, and Gemini.</p>
        </Card>

        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Keyword</th>
                <th className="pb-2 font-medium">Platform</th>
                <th className="pb-2 font-medium">Cited</th>
                <th className="pb-2 font-medium">Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {aiCitations.map((c, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{c.keyword}</td>
                  <td className="py-2.5"><Badge tone="neutral">{c.platform}</Badge></td>
                  <td className="py-2.5">
                    {c.cited ? (
                      <span className="flex items-center gap-1 text-success text-small"><CheckCircle2 className="h-4 w-4" /> Cited</span>
                    ) : (
                      <span className="flex items-center gap-1 text-neutral text-small"><XCircle className="h-4 w-4" /> Not cited</span>
                    )}
                  </td>
                  <td className="py-2.5 text-neutral">{c.lastChecked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
