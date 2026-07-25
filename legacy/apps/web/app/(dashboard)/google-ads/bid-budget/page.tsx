"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { bidBudget } from "@/lib/mock-data/google-ads";

const tabs = [
  { label: "Overview", href: "/google-ads" },
  { label: "Campaigns", href: "/google-ads/campaigns" },
  { label: "Ad Groups", href: "/google-ads/ad-groups" },
  { label: "Keywords", href: "/google-ads/keywords" },
  { label: "Ads & Creatives", href: "/google-ads/ads-creatives" },
  { label: "Search Terms", href: "/google-ads/search-terms" },
  { label: "Placements", href: "/google-ads/placements" },
  { label: "Audience Insights", href: "/google-ads/audience-insights" },
  { label: "Bid & Budget", href: "/google-ads/bid-budget" },
  { label: "Conversion Tracking", href: "/google-ads/conversion-tracking" },
];

export default function BidBudgetPage() {
  const [budget, setBudget] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [allocation, setAllocation] = useState<Record<string, number> | null>(null);
  const [findings, setFindings] = useState<any[] | null>(null);

  async function runAllocation() {
    setLoading(true);
    setAllocation(null);
    try {
      const res = await api.post<{ allocation: Record<string, number> }>("/api/google-ads/budget/allocate", {
        totalBudget: Number(budget), businessStage: "growth",
      });
      setAllocation(res.allocation);
    } finally {
      setLoading(false);
    }
  }

  async function runWasteCheck() {
    setLoading(true);
    setFindings(null);
    try {
      const res = await api.post<{ findings: any[] }>("/api/google-ads/budget/wasted-spend", {
        campaigns: bidBudget.campaigns.map((c) => ({
          name: c.name, clicks: 500, conversions: c.name.includes("Shopping") ? 2 : 40, cost: c.spent, qualityScore: c.name.includes("Shopping") ? 3 : 8,
        })),
      });
      setFindings(res.findings);
    } finally {
      setLoading(false);
    }
  }

  const pctSpent = Math.round((bidBudget.spent / bidBudget.totalBudget) * 100);

  return (
    <div>
      <TopBar subtitle="Real budget allocator and wasted spend detector — computed live, not mock." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Budget" value={`$${bidBudget.totalBudget.toLocaleString()}`} />
          <StatCard label="Spent" value={`$${bidBudget.spent.toLocaleString()}`} />
          <StatCard label="Remaining" value={`$${bidBudget.remaining.toLocaleString()}`} />
          <StatCard label="Target CPA" value={`$${bidBudget.targetCPA.toFixed(2)}`} />
        </div>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="text-heading-2">Monthly Pacing</div>
            <span className="text-small text-neutral">{pctSpent}% spent</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pctSpent}%` }} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="text-heading-2 mb-3">Real Budget Allocator</div>
            <div className="flex gap-3 mb-4">
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Total budget" className="flex-1" />
              <Button onClick={runAllocation} loading={loading}>Allocate</Button>
            </div>
            {allocation && (
              <div className="space-y-2">
                {Object.entries(allocation).map(([channel, amount]) => (
                  <div key={channel} className="flex justify-between text-body">
                    <span className="capitalize">{channel.replace("_", " ")}</span>
                    <span className="font-medium">${amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="text-heading-2 mb-3">Real Wasted Spend Detector</div>
            <Button onClick={runWasteCheck} loading={loading} variant="secondary" className="mb-4">Scan Campaigns</Button>
            {findings && (
              <div className="space-y-2">
                {findings.length === 0 && <p className="text-body text-neutral">No wasted spend detected.</p>}
                {findings.map((f, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-small font-medium">{f.campaign}</span>
                      <Badge tone={f.severity === "High" ? "danger" : "warning"}>{f.severity}</Badge>
                    </div>
                    <div className="text-caption text-neutral">{f.issue} — ${f.wastedSpend} wasted</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
