import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { behaviorAnalytics } from "@/lib/mock-data/analytics";

const tabs = [
  { label: "Overview", href: "/analytics" },
  { label: "Traffic Analytics", href: "/analytics/traffic-analytics" },
  { label: "Behavior Analytics", href: "/analytics/behavior-analytics" },
  { label: "Conversions", href: "/analytics/conversions" },
  { label: "Events", href: "/analytics/events" },
  { label: "Attribution", href: "/analytics/attribution" },
  { label: "Custom Reports", href: "/analytics/custom-reports" },
];

export default function BehaviorAnalyticsPage() {
  return (
    <div>
      <TopBar subtitle="How users engage with your site once they arrive." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Avg. Session Duration" value={behaviorAnalytics.avgSessionDuration} />
          <StatCard label="Pages per Session" value={String(behaviorAnalytics.pagesPerSession)} />
        </div>
        <Card>
          <div className="text-heading-2 mb-4">Top Events</div>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {behaviorAnalytics.topEvents.map((e) => (
                <tr key={e.event} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{e.event}</td>
                  <td className="py-2.5 text-neutral">{e.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
