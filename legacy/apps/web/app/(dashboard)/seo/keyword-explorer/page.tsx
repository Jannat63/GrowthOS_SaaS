"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { Search, Loader2 } from "lucide-react";
import { useKeywordResearch } from "@/lib/hooks/useKeywordResearch";

export default function KeywordExplorerPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useKeywordResearch();
  const scored = data?.data ?? [];
  const filtered = scored.filter((k) => k.keyword.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <TopBar subtitle="Keyword opportunity scoring — real composite score (volume, difficulty, competitor gap, paid proof, GEO potential)." />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Input placeholder="Filter keywords..." leftIcon={<Search className="h-4 w-4" />} value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
          <DataSourceBadge source={data?.source} />
        </div>

        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-neutral">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Scoring keywords...
            </div>
          ) : (
            <table className="w-full text-body">
              <thead>
                <tr className="text-caption text-neutral text-left border-b border-slate-100">
                  <th className="pb-2 font-medium">Keyword</th>
                  <th className="pb-2 font-medium">Volume</th>
                  <th className="pb-2 font-medium">Difficulty</th>
                  <th className="pb-2 font-medium">Position</th>
                  <th className="pb-2 font-medium">Paid Conversions</th>
                  <th className="pb-2 font-medium">Opportunity Score</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => (
                  <tr key={k.keyword} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 font-medium">{k.keyword}</td>
                    <td className="py-2.5 text-neutral">{k.volume.toLocaleString()}</td>
                    <td className="py-2.5 text-neutral">{k.difficulty}</td>
                    <td className="py-2.5 text-neutral">{k.currentPosition ?? "—"}</td>
                    <td className="py-2.5 text-neutral">{k.paidProvenConversions}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${k.opportunityScore}%` }} />
                        </div>
                        <span className="font-medium">{k.opportunityScore}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <Badge tone={k.label === "Paid-Proven, Organic Needed" ? "primary" : k.label === "High Priority" ? "success" : k.label === "Low Priority" ? "danger" : "neutral"}>
                        {k.label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
