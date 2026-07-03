import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { contentBriefs } from "@/lib/mock-data/seo";

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

const statusTone: Record<string, "success" | "primary" | "neutral" | "warning"> = {
  Published: "success",
  "In Progress": "primary",
  Draft: "warning",
  "Not Started": "neutral",
};

export default function ContentStudioPage() {
  return (
    <div>
      <TopBar subtitle="AI-assisted content briefs and on-page SEO scoring." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button size="sm">+ New Content Brief</Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {contentBriefs.map((b) => (
            <Card key={b.title}>
              <div className="flex items-center justify-between mb-2">
                <Badge tone={statusTone[b.status]}>{b.status}</Badge>
                <span className="text-caption text-neutral">{b.wordTarget.toLocaleString()} word target</span>
              </div>
              <div className="text-heading-2 mb-1">{b.title}</div>
              <p className="text-body text-neutral mb-3">Target keyword: {b.targetKeyword}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${b.score}%` }} />
                </div>
                <span className="text-small font-medium">{b.score}/100</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
