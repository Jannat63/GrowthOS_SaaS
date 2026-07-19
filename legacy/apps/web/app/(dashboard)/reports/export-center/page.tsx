import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Download } from "lucide-react";
import { recentReports } from "@/lib/mock-data/reports";

const tabs = [
  { label: "Overview", href: "/reports" },
  { label: "Custom Reports", href: "/reports/custom-reports" },
  { label: "Scheduled Reports", href: "/reports/scheduled-reports" },
  { label: "Report Templates", href: "/reports/templates" },
  { label: "Export Center", href: "/reports/export-center" },
];

export default function ExportCenterPage() {
  return (
    <div>
      <TopBar subtitle="Download or share previously generated reports." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Report</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((r) => (
                <tr key={r.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{r.name}</td>
                  <td className="py-2.5"><Badge tone="neutral">{r.type}</Badge></td>
                  <td className="py-2.5 text-neutral">{r.date}</td>
                  <td className="py-2.5 text-right"><Download className="h-4 w-4 text-neutral inline cursor-pointer" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
