import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { siteAuditIssues } from "@/lib/mock-data/seo";

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

export default function SiteAuditPage() {
  const allIssues = [...siteAuditIssues.critical, ...siteAuditIssues.warnings, ...siteAuditIssues.notices];

  return (
    <div>
      <TopBar subtitle="Full site crawl results — broken links, meta issues, crawlability." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card className="flex flex-col items-center justify-center py-6">
            <div className="text-display-1 text-success">{siteAuditIssues.score}</div>
            <div className="text-small text-neutral">Site Health Score</div>
          </Card>
          <Card className="flex flex-col items-center justify-center py-6">
            <div className="text-display-2 text-danger">{siteAuditIssues.critical.reduce((s, i) => s + i.pages, 0)}</div>
            <div className="text-small text-neutral">Critical Issues</div>
          </Card>
          <Card className="flex flex-col items-center justify-center py-6">
            <div className="text-display-2 text-warning">{siteAuditIssues.warnings.reduce((s, i) => s + i.pages, 0)}</div>
            <div className="text-small text-neutral">Warnings</div>
          </Card>
          <Card className="flex flex-col items-center justify-center py-6">
            <div className="text-display-2 text-success">{siteAuditIssues.passed.toLocaleString()}</div>
            <div className="text-small text-neutral">Passed Checks</div>
          </Card>
        </div>

        <Card>
          <div className="text-heading-2 mb-4">All Issues</div>
          <div className="space-y-2">
            {allIssues.map((i) => (
              <div key={i.issue} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                <div className="text-body">{i.issue}</div>
                <div className="flex items-center gap-3">
                  <span className="text-small text-neutral">{i.pages} pages</span>
                  <Badge tone={i.severity === "Critical" ? "danger" : i.severity === "Warning" ? "warning" : "neutral"}>
                    {i.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
