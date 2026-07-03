import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { scheduledReportsList } from "@/lib/mock-data/reports";

const tabs = [
  { label: "Overview", href: "/reports" },
  { label: "Custom Reports", href: "/reports/custom-reports" },
  { label: "Scheduled Reports", href: "/reports/scheduled-reports" },
  { label: "Report Templates", href: "/reports/templates" },
  { label: "Export Center", href: "/reports/export-center" },
];

export default function ScheduledReportsPage() {
  return (
    <div>
      <TopBar subtitle="Reports delivered automatically to your team." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {scheduledReportsList.map((r) => (
          <Card key={r.name} className="flex items-center justify-between">
            <div>
              <div className="text-body font-medium">{r.name}</div>
              <div className="text-caption text-neutral">{r.recipients} recipients · Next: {r.nextDelivery}</div>
            </div>
            <Badge tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Paused"}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
