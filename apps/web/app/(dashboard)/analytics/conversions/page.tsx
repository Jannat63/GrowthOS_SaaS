import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { conversionsDetail } from "@/lib/mock-data/analytics";

const tabs = [
  { label: "Overview", href: "/analytics" },
  { label: "Traffic Analytics", href: "/analytics/traffic-analytics" },
  { label: "Behavior Analytics", href: "/analytics/behavior-analytics" },
  { label: "Conversions", href: "/analytics/conversions" },
  { label: "Events", href: "/analytics/events" },
  { label: "Attribution", href: "/analytics/attribution" },
  { label: "Custom Reports", href: "/analytics/custom-reports" },
];

export default function ConversionsPage() {
  return (
    <div>
      <TopBar subtitle="Conversion rates by funnel path." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {conversionsDetail.map((f) => (
          <Card key={f.funnel} className="flex items-center justify-between">
            <div className="text-body">{f.funnel}</div>
            <div className="flex items-center gap-6">
              <span className="text-small text-neutral">{f.sessions.toLocaleString()} sessions</span>
              <span className="text-heading-2 text-success">{f.rate}%</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
