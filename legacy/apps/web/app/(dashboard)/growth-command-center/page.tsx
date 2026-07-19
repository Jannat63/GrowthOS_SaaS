import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { growthHubStats } from "@/lib/mock-data/growth-hub";
import { seoStats } from "@/lib/mock-data/seo";
import { googleAdsStats } from "@/lib/mock-data/google-ads";
import { metaAdsStats } from "@/lib/mock-data/meta-ads";

const tabs = [
  { label: "Overview", href: "/growth-command-center" },
  { label: "Growth Strategy", href: "/growth-command-center/growth-strategy" },
  { label: "Forecasting", href: "/growth-command-center/forecasting" },
  { label: "Scenario Planner", href: "/growth-command-center/scenario-planner" },
  { label: "Resource Allocation", href: "/growth-command-center/resource-allocation" },
  { label: "OKR Tracking", href: "/growth-command-center/okr-tracking" },
  { label: "Alerts & Signals", href: "/growth-command-center/alerts-signals" },
];

export default function GrowthCommandCenterPage() {
  return (
    <div>
      <TopBar subtitle="Your central hub for growth strategy, forecasting, and decision-making." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Total Revenue (Est.)" value={growthHubStats.totalRevenue.value} change={growthHubStats.totalRevenue.change} />
          <StatCard label="Growth Score" value={String(growthHubStats.growthScore.value)} change={growthHubStats.growthScore.change} />
          <StatCard label="Organic Traffic" value={seoStats.organicTraffic.value} change={seoStats.organicTraffic.change} />
          <StatCard label="Google Ads Conversions" value={googleAdsStats.conversions.value} change={googleAdsStats.conversions.change} />
          <StatCard label="Meta ROAS" value={metaAdsStats.purchaseROAS.value} change={metaAdsStats.purchaseROAS.change} />
        </div>

        <Card>
          <div className="text-heading-2 mb-4">Next 90 Days Roadmap</div>
          <div className="space-y-3">
            {[
              { title: "Optimize SEO & Content", window: "May 13 – Jun 12, 2026", status: "In Progress" },
              { title: "Scale Google Ads", window: "May 20 – Jun 30, 2026", status: "Upcoming" },
              { title: "Meta Ads Expansion", window: "Jun 1 – Jul 15, 2026", status: "Upcoming" },
              { title: "Conversion Optimization", window: "Jun 10 – Jul 25, 2026", status: "Planned" },
            ].map((item) => (
              <div key={item.title} className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3">
                <div>
                  <div className="text-body font-medium">{item.title}</div>
                  <div className="text-caption text-neutral">{item.window}</div>
                </div>
                <Badge tone={item.status === "In Progress" ? "success" : item.status === "Upcoming" ? "primary" : "neutral"}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
