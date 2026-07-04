"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FileText, Download } from "lucide-react";
import { calculateBlendedMER } from "@/lib/logic/blended-mer";
import { revenueSourcesForMER, recentReports } from "@/lib/mock-data/reports";

const tabs = [
  { label: "Overview", href: "/reports" },
  { label: "Custom Reports", href: "/reports/custom-reports" },
  { label: "Scheduled Reports", href: "/reports/scheduled-reports" },
  { label: "Report Templates", href: "/reports/templates" },
  { label: "Export Center", href: "/reports/export-center" },
];

export default function ReportsPage() {
  const [inputs, setInputs] = useState(revenueSourcesForMER);
  const result = calculateBlendedMER(inputs);

  return (
    <div>
      <TopBar subtitle="Generate, analyze, and share comprehensive reports." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1">
            <div className="text-heading-2 mb-1">Blended MER Calculator</div>
            <p className="text-caption text-neutral mb-4">Real formula: Total Revenue ÷ (Google Ads Spend + Meta Ads Spend)</p>
            <div className="space-y-3">
              <div>
                <label className="text-small text-neutral">Total Revenue ($)</label>
                <Input
                  type="number"
                  value={inputs.totalRevenue}
                  onChange={(e) => setInputs({ ...inputs, totalRevenue: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-small text-neutral">Google Ads Spend ($)</label>
                <Input
                  type="number"
                  value={inputs.googleAdsSpend}
                  onChange={(e) => setInputs({ ...inputs, googleAdsSpend: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-small text-neutral">Meta Ads Spend ($)</label>
                <Input
                  type="number"
                  value={inputs.metaAdsSpend}
                  onChange={(e) => setInputs({ ...inputs, metaAdsSpend: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="text-caption text-neutral">Blended MER</div>
              <div className="text-display-2 text-primary">{result.blendedMER}x</div>
              <p className="text-small text-neutral mt-1">{result.interpretation}</p>
            </div>
          </Card>

          <Card className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="text-heading-2">Recent Reports</div>
              <Button size="sm">Create Report</Button>
            </div>
            <div className="space-y-2">
              {recentReports.map((r) => (
                <div key={r.name} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-neutral" />
                    <div>
                      <div className="text-body">{r.name}</div>
                      <div className="text-caption text-neutral">{r.date}</div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-neutral" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
