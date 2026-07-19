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
import { metaCreativeLibrary } from "@/lib/mock-data/meta-ads";

const tabs = [
  { label: "Overview", href: "/meta-ads" },
  { label: "Campaigns", href: "/meta-ads/campaigns" },
  { label: "Ad Sets", href: "/meta-ads/ad-sets" },
  { label: "Ads", href: "/meta-ads/ads" },
  { label: "Audiences", href: "/meta-ads/audiences" },
  { label: "Placements", href: "/meta-ads/placements" },
  { label: "Creative Library", href: "/meta-ads/creative-library" },
  { label: "A/B Tests", href: "/meta-ads/ab-tests" },
  { label: "Budget & Bidding", href: "/meta-ads/budget-bidding" },
  { label: "Conversion Tracking", href: "/meta-ads/conversion-tracking" },
];

const fatigueTone: Record<string, "danger" | "warning" | "success"> = { Fatigued: "danger", "At Risk": "warning", Healthy: "success" };

interface AdCopyVariant { hook: string; body: string; cta: string; }

export default function CreativeLibraryPage() {
  const [product, setProduct] = useState("Ergo Chair");
  const [benefit, setBenefit] = useState("all-day comfort");
  const [painPoint, setPainPoint] = useState("back pain");
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<AdCopyVariant[] | null>(null);
  const [ugcScript, setUgcScript] = useState<any>(null);

  async function generateCopy() {
    setLoading(true);
    setVariants(null);
    try {
      const res = await api.post<{ variants: AdCopyVariant[] }>("/api/meta-ads/creatives/ad-copy", { product, benefit, painPoint });
      setVariants(res.variants);
    } finally {
      setLoading(false);
    }
  }

  async function generateUGC() {
    setLoading(true);
    setUgcScript(null);
    try {
      const res = await api.post("/api/meta-ads/creatives/ugc-script", { product, duration: 30 });
      setUgcScript(res);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <TopBar subtitle="Real ad copy + UGC script generators — template-based, no paid AI." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-6">
        <Card>
          <div className="text-heading-2 mb-3">Generate Creative</div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product name" />
            <Input value={benefit} onChange={(e) => setBenefit(e.target.value)} placeholder="Key benefit" />
            <Input value={painPoint} onChange={(e) => setPainPoint(e.target.value)} placeholder="Pain point" />
          </div>
          <div className="flex gap-3">
            <Button onClick={generateCopy} loading={loading}>Generate Ad Copy</Button>
            <Button onClick={generateUGC} loading={loading} variant="secondary">Generate UGC Script</Button>
          </div>
        </Card>

        {loading && <div className="flex items-center justify-center py-8 text-neutral"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generating...</div>}

        {variants && (
          <Card>
            <div className="text-heading-2 mb-3">Ad Copy Variants</div>
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-3">
                  <div className="text-body font-medium mb-1">{v.hook}</div>
                  <div className="text-body text-neutral mb-2">{v.body}</div>
                  <Badge tone="primary">{v.cta}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {ugcScript && (
          <Card>
            <div className="text-heading-2 mb-3">{ugcScript.durationSeconds}s UGC Script</div>
            <div className="space-y-2 text-body">
              <div><span className="text-caption text-neutral">Hook:</span> {ugcScript.hook}</div>
              <div><span className="text-caption text-neutral">Demo:</span> {ugcScript.demo}</div>
              <div><span className="text-caption text-neutral">Testimonial:</span> {ugcScript.testimonial}</div>
              <div><span className="text-caption text-neutral">CTA:</span> {ugcScript.cta}</div>
            </div>
          </Card>
        )}

        <div>
          <div className="text-heading-2 mb-3">Existing Creatives</div>
          <div className="grid grid-cols-2 gap-4">
            {metaCreativeLibrary.map((c) => (
              <Card key={c.name}>
                <div className="flex items-center justify-between mb-2">
                  <Badge tone="neutral">{c.format}</Badge>
                  <Badge tone={fatigueTone[c.fatigueStatus]}>{c.fatigueStatus}</Badge>
                </div>
                <div className="text-heading-2 mb-1">{c.name}</div>
                <div className="flex justify-between text-body">
                  <span className="text-neutral">{c.conversions} conversions</span>
                  <span className="font-medium text-success">{c.roas} ROAS</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
