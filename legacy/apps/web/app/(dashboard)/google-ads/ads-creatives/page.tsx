"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { adCreatives } from "@/lib/mock-data/google-ads";

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

const strengthTone: Record<string, "success" | "warning" | "neutral"> = { Excellent: "success", Good: "success", Average: "warning" };

export default function AdsCreativesPage() {
  const [keyword, setKeyword] = useState("office chair");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ headlines: string[]; descriptions: string[] } | null>(null);

  async function generate() {
    setLoading(true);
    setGenerated(null);
    try {
      const res = await api.post<{ headlines: string[]; descriptions: string[] }>("/api/google-ads/creatives/rsa-headlines", { keyword });
      setGenerated(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopBar subtitle="Real RSA headline generator — enforces the actual 30-character Google Ads limit." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card>
          <div className="text-heading-2 mb-3">Generate RSA Headlines</div>
          <div className="flex gap-3">
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Product or keyword" className="flex-1" />
            <Button onClick={generate} loading={loading}>Generate</Button>
          </div>
        </Card>

        {loading && <div className="flex items-center justify-center py-12 text-neutral"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating...</div>}

        {generated && (
          <Card>
            <div className="text-heading-2 mb-3">Headlines ({generated.headlines.length})</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {generated.headlines.map((h, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-2 text-small">
                  {h} <span className="text-caption text-neutral">({h.length}/30)</span>
                </div>
              ))}
            </div>
            <div className="text-heading-2 mb-3">Descriptions</div>
            <div className="space-y-2">
              {generated.descriptions.map((d, i) => <div key={i} className="text-body text-neutral">{d}</div>)}
            </div>
          </Card>
        )}

        <div>
          <div className="text-heading-2 mb-3">Existing Ad Creatives</div>
          <div className="space-y-3">
            {adCreatives.map((a) => (
              <Card key={a.headline} className="flex items-center justify-between">
                <div>
                  <div className="text-body font-medium mb-1">{a.headline}</div>
                  <Badge tone="neutral">{a.type}</Badge>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-caption text-neutral">CTR</div>
                    <div className="text-heading-2">{a.ctr}%</div>
                  </div>
                  <Badge tone={strengthTone[a.adStrength]}>{a.adStrength}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
