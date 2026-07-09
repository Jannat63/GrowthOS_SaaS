import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const opportunities = [
  { title: "Optimize organic landing pages", desc: "Improve rankings & increase organic traffic", impact: "High", value: "+$4,250" },
  { title: "Increase Google Ads conversion rate", desc: "Improve ad copy & landing page experience", impact: "High", value: "+$3,780" },
  { title: "Improve Meta Ads ROAS", desc: "Refine audience & creative strategy", impact: "High", value: "+$3,210" },
  { title: "Reduce landing page bounce rate", desc: "Optimize page speed & content", impact: "Medium", value: "+$1,860" },
];

const tabs = [
  { label: "Overview", href: "/optimization-engine" },
  { label: "Recommendations", href: "/optimization-engine/recommendations" },
  { label: "A/B Testing", href: "/optimization-engine/ab-testing" },
  { label: "Automations", href: "/optimization-engine/automations" },
  { label: "Performance Boosters", href: "/optimization-engine/performance-boosters" },
];

export default function OptimizationEnginePage() {
  return (
    <div>
      <TopBar subtitle="Automate optimization, validate what works, and drive continuous improvement." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Optimizations Running" value="24" change="+20%" />
          <StatCard label="Improvement (Est.)" value="+18.7%" change="+4.3%" />
          <StatCard label="Revenue Impact (Est.)" value="$27,540" change="+23.6%" />
          <StatCard label="Optimization Score" value="91/100" change="+7" />
        </div>

        <Card>
          <div className="text-heading-2 mb-4">Top Optimization Opportunities</div>
          <div className="space-y-3">
            {opportunities.map((o) => (
              <div key={o.title} className="flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3">
                <div>
                  <div className="text-body font-medium">{o.title}</div>
                  <div className="text-caption text-neutral">{o.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-body font-medium text-success">{o.value}</span>
                  <Badge tone={o.impact === "High" ? "success" : "warning"}>{o.impact} Impact</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
