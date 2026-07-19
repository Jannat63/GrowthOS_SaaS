import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { metaABTests } from "@/lib/mock-data/meta-ads";

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

export default function ABTestsPage() {
  return (
    <div>
      <TopBar subtitle="Running and completed creative and copy tests." />
      <ModuleTabs items={tabs} />
      <div className="p-6 space-y-3">
        {metaABTests.map((t) => (
          <Card key={t.name}>
            <div className="text-heading-2 mb-3">{t.name}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`border rounded-lg p-3 ${t.winner === "A" ? "border-success bg-success/5" : "border-slate-100"}`}>
                <div className="text-caption text-neutral mb-1">Variant A {t.winner === "A" && "🏆"}</div>
                <div className="text-body">{t.variantA}</div>
              </div>
              <div className={`border rounded-lg p-3 ${t.winner === "B" ? "border-success bg-success/5" : "border-slate-100"}`}>
                <div className="text-caption text-neutral mb-1">Variant B {t.winner === "B" && "🏆"}</div>
                <div className="text-body">{t.variantB}</div>
              </div>
            </div>
            <div className="mt-3">
              <Badge tone="success">Winner: Variant {t.winner} ({t.lift})</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
