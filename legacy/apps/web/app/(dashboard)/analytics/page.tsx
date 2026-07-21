import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { analyticsStats, trafficByChannel, sessionsTrend } from "@/lib/mock-data/analytics";

const tabs = [
  { label: "Overview", href: "/analytics" },
  { label: "Traffic Analytics", href: "/analytics/traffic-analytics" },
  { label: "Behavior Analytics", href: "/analytics/behavior-analytics" },
  { label: "Conversions", href: "/analytics/conversions" },
  { label: "Events", href: "/analytics/events" },
  { label: "Attribution", href: "/analytics/attribution" },
  { label: "Custom Reports", href: "/analytics/custom-reports" },
];

export default function AnalyticsOverviewPage() {
  const maxSessions = Math.max(...sessionsTrend.map((d) => d.sessions));

  return (
    <div>
      <TopBar subtitle="Track website performance, user behavior, and key metrics." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Users" value={analyticsStats.users.value} change={analyticsStats.users.change} />
          <StatCard label="Sessions" value={analyticsStats.sessions.value} change={analyticsStats.sessions.change} />
          <StatCard label="Page Views" value={analyticsStats.pageViews.value} change={analyticsStats.pageViews.change} />
          <StatCard label="Bounce Rate" value={analyticsStats.bounceRate.value} change={analyticsStats.bounceRate.change} changeDirection="down" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <div className="text-heading-2 mb-4">Sessions Trend</div>
            <div className="flex items-end gap-3 h-40">
              {sessionsTrend.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary/80 rounded-t-md"
                    style={{ height: `${(d.sessions / maxSessions) * 100}%` }}
                  />
                  <span className="text-caption text-neutral">{d.day.split(" ")[1]}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-heading-2 mb-4">Traffic by Channel</div>
            <div className="space-y-3">
              {trafficByChannel.map((c) => (
                <div key={c.channel}>
                  <div className="flex justify-between text-small mb-1">
                    <span>{c.channel}</span>
                    <span className="text-neutral">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
