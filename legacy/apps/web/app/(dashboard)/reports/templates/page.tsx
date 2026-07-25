import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { reportTemplatesList } from "@/lib/mock-data/reports";

const tabs = [
  { label: "Overview", href: "/reports" },
  { label: "Custom Reports", href: "/reports/custom-reports" },
  { label: "Scheduled Reports", href: "/reports/scheduled-reports" },
  { label: "Report Templates", href: "/reports/templates" },
  { label: "Export Center", href: "/reports/export-center" },
];

export default function ReportTemplatesPage() {
  return (
    <div>
      <TopBar subtitle="Pre-built report templates for every channel." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-2 gap-4">
        {reportTemplatesList.map((t) => (
          <Card key={t.name} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium mb-1">{t.name}</div>
              <div className="text-caption text-neutral">{t.desc}</div>
            </div>
            <Button size="sm" variant="secondary">Use</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
