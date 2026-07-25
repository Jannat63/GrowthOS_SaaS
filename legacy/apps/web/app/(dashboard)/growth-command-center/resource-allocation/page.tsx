import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { resourceAllocation } from "@/lib/mock-data/growth-command-center";

const tabs = [
  { label: "Overview", href: "/growth-command-center" },
  { label: "Growth Strategy", href: "/growth-command-center/growth-strategy" },
  { label: "Forecasting", href: "/growth-command-center/forecasting" },
  { label: "Scenario Planner", href: "/growth-command-center/scenario-planner" },
  { label: "Resource Allocation", href: "/growth-command-center/resource-allocation" },
  { label: "OKR Tracking", href: "/growth-command-center/okr-tracking" },
  { label: "Alerts & Signals", href: "/growth-command-center/alerts-signals" },
];

export default function ResourceAllocationPage() {
  return (
    <div>
      <TopBar subtitle="Team and budget allocation by channel." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Channel</th>
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 font-medium">Budget</th>
                <th className="pb-2 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {resourceAllocation.map((r) => (
                <tr key={r.channel} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{r.channel}</td>
                  <td className="py-2.5 text-neutral">{r.team}</td>
                  <td className="py-2.5 text-neutral">{r.budget}</td>
                  <td className="py-2.5 font-medium text-success">{r.roi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
