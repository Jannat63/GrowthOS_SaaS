import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { coreWebVitals } from "@/lib/mock-data/seo";

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

export default function TechnicalSEOPage() {
  return (
    <div>
      <TopBar subtitle="Core Web Vitals, mobile usability, and crawlability health." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card>
          <div className="text-heading-2 mb-4">Core Web Vitals</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-slate-100 rounded-lg p-4 text-center">
              <div className="text-caption text-neutral mb-1">LCP (Largest Contentful Paint)</div>
              <div className="text-display-2 mb-1">{coreWebVitals.lcp.value}{coreWebVitals.lcp.unit}</div>
              <Badge tone="success">{coreWebVitals.lcp.status}</Badge>
            </div>
            <div className="border border-slate-100 rounded-lg p-4 text-center">
              <div className="text-caption text-neutral mb-1">INP (Interaction to Next Paint)</div>
              <div className="text-display-2 mb-1">{coreWebVitals.inp.value}{coreWebVitals.inp.unit}</div>
              <Badge tone="success">{coreWebVitals.inp.status}</Badge>
            </div>
            <div className="border border-slate-100 rounded-lg p-4 text-center">
              <div className="text-caption text-neutral mb-1">CLS (Cumulative Layout Shift)</div>
              <div className="text-display-2 mb-1">{coreWebVitals.cls.value}</div>
              <Badge tone="warning">{coreWebVitals.cls.status}</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
