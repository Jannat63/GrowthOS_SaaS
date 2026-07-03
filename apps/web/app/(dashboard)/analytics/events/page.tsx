import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { eventsDetail } from "@/lib/mock-data/analytics";

const tabs = [
  { label: "Overview", href: "/analytics" },
  { label: "Traffic Analytics", href: "/analytics/traffic-analytics" },
  { label: "Behavior Analytics", href: "/analytics/behavior-analytics" },
  { label: "Conversions", href: "/analytics/conversions" },
  { label: "Events", href: "/analytics/events" },
  { label: "Attribution", href: "/analytics/attribution" },
  { label: "Custom Reports", href: "/analytics/custom-reports" },
];

export default function EventsPage() {
  return (
    <div>
      <TopBar subtitle="All tracked events across your site." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Event Name</th>
                <th className="pb-2 font-medium">Count</th>
                <th className="pb-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {eventsDetail.map((e) => (
                <tr key={e.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{e.name}</td>
                  <td className="py-2.5 text-neutral">{e.count.toLocaleString()}</td>
                  <td className="py-2.5 text-success">{e.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
