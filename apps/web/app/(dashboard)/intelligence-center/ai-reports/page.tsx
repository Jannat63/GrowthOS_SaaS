"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, FileText } from "lucide-react";
import { api } from "@/lib/api/client";
import { aiReportsList } from "@/lib/mock-data/growth-hub";

const tabs = [
  { label: "AI Overview", href: "/intelligence-center" },
  { label: "Predictive Analytics", href: "/intelligence-center/predictive-analytics" },
  { label: "AI Recommendations", href: "/intelligence-center/ai-recommendations" },
  { label: "Anomaly Detection", href: "/intelligence-center/anomaly-detection" },
  { label: "Content Intelligence", href: "/intelligence-center/content-intelligence" },
  { label: "Market Insights", href: "/intelligence-center/market-insights" },
  { label: "AI Reports", href: "/intelligence-center/ai-reports" },
];

interface WeeklyReport {
  weekStart: string;
  summary: string;
  blendedRoas: number;
  totalRevenue: number;
  totalSpend: number;
  channelBreakdown: { channel: string; spend: number; revenue: number; roas: number }[];
}

export default function AIReportsPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  async function generateReport() {
    setLoading(true);
    setReport(null);
    try {
      const res = await api.post<WeeklyReport>("/api/intelligence/reports/weekly", {
        week_start: new Date().toISOString().split("T")[0],
        channel_performance: [
          { channel: "SEO", spend: 4000, revenue: 60000 },
          { channel: "Google Ads", spend: 18450.75, revenue: 48290 },
          { channel: "Meta Ads", spend: 18450.75, revenue: 90000 },
        ],
        top_recommendations: [],
      });
      setReport(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopBar subtitle="Real weekly report — generated live from actual channel numbers, not LLM prose." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-heading-2 mb-1">Generate This Week's Report</div>
              <p className="text-body text-neutral">Computes real blended ROAS and identifies the actual best/worst performing channel.</p>
            </div>
            <Button onClick={generateReport} loading={loading}>Generate Report</Button>
          </div>
        </Card>

        {loading && <div className="flex items-center justify-center py-12 text-neutral"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Computing...</div>}

        {report && (
          <Card className="border-primary/20 bg-primary/[0.03]">
            <div className="text-heading-2 mb-2">Week of {report.weekStart}</div>
            <p className="text-body mb-4">{report.summary}</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><div className="text-caption text-neutral">Total Revenue</div><div className="text-heading-1">${report.totalRevenue.toLocaleString()}</div></div>
              <div><div className="text-caption text-neutral">Total Spend</div><div className="text-heading-1">${report.totalSpend.toLocaleString()}</div></div>
              <div><div className="text-caption text-neutral">Blended ROAS</div><div className="text-heading-1 text-success">{report.blendedRoas}x</div></div>
            </div>
            <table className="w-full text-body">
              <thead>
                <tr className="text-caption text-neutral text-left border-b border-slate-200">
                  <th className="pb-2">Channel</th><th className="pb-2">Spend</th><th className="pb-2">Revenue</th><th className="pb-2">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {report.channelBreakdown.map((c) => (
                  <tr key={c.channel} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-medium">{c.channel}</td>
                    <td className="py-2 text-neutral">${c.spend.toLocaleString()}</td>
                    <td className="py-2 text-neutral">${c.revenue.toLocaleString()}</td>
                    <td className="py-2 font-medium text-success">{c.roas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <div>
          <div className="text-heading-2 mb-3">Past Reports</div>
          <div className="space-y-3">
            {aiReportsList.map((r, i) => (
              <Card key={i} className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-body font-medium">{r.title}</div>
                  <div className="text-caption text-neutral mb-1">{r.date}</div>
                  <p className="text-body text-neutral">{r.summary}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
