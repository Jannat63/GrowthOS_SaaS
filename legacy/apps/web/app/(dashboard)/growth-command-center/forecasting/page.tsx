import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { forecastingSummary } from "@/lib/mock-data/growth-command-center";

const tabs = [
  { label: "Overview", href: "/growth-command-center" },
  { label: "Growth Strategy", href: "/growth-command-center/growth-strategy" },
  { label: "Forecasting", href: "/growth-command-center/forecasting" },
  { label: "Scenario Planner", href: "/growth-command-center/scenario-planner" },
  { label: "Resource Allocation", href: "/growth-command-center/resource-allocation" },
  { label: "OKR Tracking", href: "/growth-command-center/okr-tracking" },
  { label: "Alerts & Signals", href: "/growth-command-center/alerts-signals" },
];

export default function ForecastingPage() {
  return (
    <div>
      <TopBar subtitle="30-day forward-looking projections." />
      <ModuleTabs items={tabs} />
      <div className="p-6 grid grid-cols-3 gap-4">
        <StatCard label="Forecasted Sessions (30d)" value={forecastingSummary.next30Days.sessions.toLocaleString()} />
        <StatCard label="Forecasted Revenue (30d)" value={`$${forecastingSummary.next30Days.revenue.toLocaleString()}`} />
        <StatCard label="Forecast Confidence" value={`${forecastingSummary.confidence}%`} />
      </div>
    </div>
  );
}
