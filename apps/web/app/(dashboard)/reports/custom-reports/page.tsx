import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { customReportsList } from "@/lib/mock-data/reports";

const tabs = [
  { label: "Overview", href: "/reports" },
  { label: "Custom Reports", href: "/reports/custom-reports" },
  { label: "Scheduled Reports", href: "/reports/scheduled-reports" },
  { label: "Report Templates", href: "/reports/templates" },
  { label: "Export Center", href: "/reports/export-center" },
];

export default function CustomReportsPage() {
  return (
    <div>
      <TopBar subtitle="Reports built from your own metric and dimension combinations." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        <div className="flex justify-end"><Button size="sm">+ New Custom Report</Button></div>
        {customReportsList.map((r) => (
          <Card key={r.name} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium mb-1">{r.name}</div>
              <div className="flex gap-1.5">
                {r.metrics.map((m) => <Badge key={m} tone="neutral">{m}</Badge>)}
              </div>
            </div>
            <Badge tone="primary">{r.schedule}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
