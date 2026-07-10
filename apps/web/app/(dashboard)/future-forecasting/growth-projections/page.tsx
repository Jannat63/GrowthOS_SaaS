import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { growthProjections } from "@/lib/mock-data/future-forecasting";

const tabs = [
  { label: "Overview", href: "/future-forecasting" },
  { label: "Forecast Models", href: "/future-forecasting/forecast-models" },
  { label: "Scenario Planner", href: "/future-forecasting/scenario-planner" },
  { label: "Growth Projections", href: "/future-forecasting/growth-projections" },
  { label: "Risk Assessment", href: "/future-forecasting/risk-assessment" },
  { label: "Goal Simulator", href: "/future-forecasting/goal-simulator" },
];

export default function GrowthProjectionsPage() {
  return (
    <div>
      <TopBar subtitle="Current vs 90-day projected performance." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium">Current</th>
                <th className="pb-2 font-medium">Projected (90d)</th>
                <th className="pb-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {growthProjections.map((g) => (
                <tr key={g.metric} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{g.metric}</td>
                  <td className="py-2.5 text-neutral">{g.current}</td>
                  <td className="py-2.5 text-neutral">{g.projected90d}</td>
                  <td className="py-2.5 text-success">{g.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
