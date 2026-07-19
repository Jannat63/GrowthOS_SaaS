"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api/client";

const tabs = [
  { label: "Overview", href: "/seo" },
  { label: "Keyword Explorer", href: "/seo/keyword-explorer" },
  { label: "Rank Tracker", href: "/seo/rank-tracker" },
  { label: "Site Audit", href: "/seo/site-audit" },
  { label: "Content Studio", href: "/seo/content-studio" },
  { label: "Technical SEO", href: "/seo/technical-seo" },
  { label: "Backlinks", href: "/seo/backlinks" },
  { label: "AI Citations", href: "/seo/ai-citations" },
];

interface Metric { value: string | null; numericValue: number | null; score: number | null; }
interface VitalsResult { url: string; strategy: string; performanceScore: number; lcp: Metric; cls: Metric; inp: Metric; fcp: Metric; }

export default function TechnicalSEOPage() {
  const [url, setUrl] = useState("https://github.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VitalsResult | null>(null);

  async function checkVitals() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.get<VitalsResult>(`/api/seo/technical/core-web-vitals?url=${encodeURIComponent(url)}&strategy=mobile`);
      setResult(res);
    } catch (e) {
      setError("Couldn't fetch Core Web Vitals — this uses the free Google PageSpeed API, which needs outbound internet access from the backend. It may not work in a network-restricted environment.");
    } finally {
      setLoading(false);
    }
  }

  function scoreTone(score: number | null) {
    if (score === null) return "neutral";
    if (score >= 0.9) return "success";
    if (score >= 0.5) return "warning";
    return "danger";
  }

  return (
    <div>
      <TopBar subtitle="Real Core Web Vitals via the free Google PageSpeed Insights API." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card>
          <div className="text-heading-2 mb-3">Check Core Web Vitals</div>
          <p className="text-body text-neutral mb-4">
            This calls Google's real PageSpeed Insights API — free, no billing required. Results are live, not mock data.
          </p>
          <div className="flex gap-3">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" leftIcon={<Search className="h-4 w-4" />} className="flex-1" />
            <Button onClick={checkVitals} loading={loading}>Check Vitals</Button>
          </div>
        </Card>

        {error && <Alert type="warning" message={error} onDismiss={() => setError(null)} />}

        {loading && (
          <div className="flex items-center justify-center py-16 text-neutral">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Fetching real PageSpeed data (can take 10-20s)...
          </div>
        )}

        {result && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="text-heading-2">Overall Performance Score</div>
              <div className="text-display-1">{result.performanceScore}</div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {([
                ["LCP", result.lcp],
                ["CLS", result.cls],
                ["INP", result.inp],
                ["FCP", result.fcp],
              ] as const).map(([label, metric]) => (
                <div key={label} className="border border-slate-100 rounded-lg p-4 text-center">
                  <div className="text-caption text-neutral mb-1">{label}</div>
                  <div className="text-heading-1 mb-2">{metric.value ?? "—"}</div>
                  <Badge tone={scoreTone(metric.score)}>{metric.score !== null ? `${Math.round(metric.score * 100)}/100` : "N/A"}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
