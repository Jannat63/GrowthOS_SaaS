import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { attributionModel } from "@/lib/mock-data/analytics";

const tabs = [
  { label: "Overview", href: "/analytics" },
  { label: "Traffic Analytics", href: "/analytics/traffic-analytics" },
  { label: "Behavior Analytics", href: "/analytics/behavior-analytics" },
  { label: "Conversions", href: "/analytics/conversions" },
  { label: "Events", href: "/analytics/events" },
  { label: "Attribution", href: "/analytics/attribution" },
  { label: "Custom Reports", href: "/analytics/custom-reports" },
];

export default function AttributionPage() {
  return (
    <div>
      <TopBar subtitle="Multi-touch attribution — first touch, last touch, and data-driven credit." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Channel</th>
                <th className="pb-2 font-medium">First Touch %</th>
                <th className="pb-2 font-medium">Last Touch %</th>
                <th className="pb-2 font-medium">Data-Driven %</th>
              </tr>
            </thead>
            <tbody>
              {attributionModel.map((a) => (
                <tr key={a.channel} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{a.channel}</td>
                  <td className="py-2.5 text-neutral">{a.firstTouch}%</td>
                  <td className="py-2.5 text-neutral">{a.lastTouch}%</td>
                  <td className="py-2.5 font-medium text-primary">{a.dataDriver}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
