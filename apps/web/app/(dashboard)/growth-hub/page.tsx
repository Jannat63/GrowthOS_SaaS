import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Zap, CheckCircle2, Circle } from "lucide-react";
import {
  growthHubStats,
  channelPerformance,
  topOpportunity,
  tasks,
} from "@/lib/mock-data/growth-hub";

export default function GrowthHubPage() {
  return (
    <div>
      <TopBar subtitle="Here's what's happening with your growth today." />
      <div className="p-6 space-y-6">
        {/* Top stat row */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Growth Score" value={String(growthHubStats.growthScore.value)} change={growthHubStats.growthScore.change} />
          <StatCard label="Total Revenue" value={growthHubStats.totalRevenue.value} change={growthHubStats.totalRevenue.change} />
          <StatCard label="Total Traffic" value={growthHubStats.totalTraffic.value} change={growthHubStats.totalTraffic.change} />
          <StatCard label="Total Conversions" value={growthHubStats.totalConversions.value} change={growthHubStats.totalConversions.change} />
          <StatCard label="Blended MER" value={growthHubStats.blendedMER.value} change={growthHubStats.blendedMER.change} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Top opportunity */}
          <Card className="col-span-2 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-heading-2">
                <Zap className="h-4 w-4 text-primary" /> Today's Top Opportunity
              </div>
              <Badge tone="primary">{topOpportunity.impact} Impact</Badge>
            </div>
            <div className="text-heading-1 mb-1">{topOpportunity.title}</div>
            <p className="text-body text-neutral mb-4">{topOpportunity.description}</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><div className="text-caption text-neutral">Potential Traffic</div><div className="text-heading-2">{topOpportunity.potentialTraffic}</div></div>
              <div><div className="text-caption text-neutral">Potential Revenue</div><div className="text-heading-2 text-success">{topOpportunity.potentialRevenue}</div></div>
              <div><div className="text-caption text-neutral">Confidence</div><div className="text-heading-2">{topOpportunity.confidence}</div></div>
            </div>
            <div className="flex gap-3">
              <Button>Execute Now</Button>
              <Button variant="secondary">View Details</Button>
            </div>
          </Card>

          {/* Tasks */}
          <Card>
            <div className="text-heading-2 mb-3">Tasks</div>
            <div className="space-y-2.5">
              {tasks.map((t) => (
                <div key={t.label} className="flex items-start gap-2 text-body">
                  {t.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-neutral mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div>{t.label}</div>
                    <div className="text-caption text-neutral">{t.due}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Channel performance */}
        <Card>
          <div className="text-heading-2 mb-4">Channels Performance</div>
          <div className="grid grid-cols-3 gap-4">
            {channelPerformance.map((c) => (
              <div key={c.channel} className="border border-slate-200 rounded-lg p-4">
                <div className="text-body font-medium mb-3">{c.channel}</div>
                <div className="flex justify-between text-small">
                  <div>
                    <div className="text-neutral">{c.metric1.label}</div>
                    <div className="font-medium">{c.metric1.value} <span className="text-success">{c.metric1.change}</span></div>
                  </div>
                  <div>
                    <div className="text-neutral">{c.metric2.label}</div>
                    <div className="font-medium">{c.metric2.value} <span className="text-success">{c.metric2.change}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
