import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { trafficAnalyticsDetail } from "@/lib/mock-data/analytics";

const tabs = [
  { label: "Overview", href: "/analytics" },
  { label: "Traffic Analytics", href: "/analytics/traffic-analytics" },
  { label: "Behavior Analytics", href: "/analytics/behavior-analytics" },
  { label: "Conversions", href: "/analytics/conversions" },
  { label: "Events", href: "/analytics/events" },
  { label: "Attribution", href: "/analytics/attribution" },
  { label: "Custom Reports", href: "/analytics/custom-reports" },
];

export default function TrafficAnalyticsPage() {
  return (
    <div>
      <TopBar subtitle="Deep dive into where your traffic comes from and lands." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-2 gap-4">
        <Card>
          <div className="text-heading-2 mb-4">Top Landing Pages</div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Page</th>
                <th className="pb-2 font-medium">Sessions</th>
                <th className="pb-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {trafficAnalyticsDetail.landingPages.map((p) => (
                <tr key={p.page} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{p.page}</td>
                  <td className="py-2.5 text-neutral">{p.sessions.toLocaleString()}</td>
                  <td className="py-2.5 text-success">{p.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <div className="text-heading-2 mb-4">Device Breakdown</div>
          <div className="space-y-3">
            {trafficAnalyticsDetail.devices.map((d) => (
              <div key={d.device} className="flex items-center gap-3">
                <span className="w-20 text-body">{d.device}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-small font-medium w-12 text-right">{d.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
