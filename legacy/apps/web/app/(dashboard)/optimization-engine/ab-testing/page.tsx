import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { abTestsList } from "@/lib/mock-data/optimization-engine";

const tabs = [
  { label: "Overview", href: "/optimization-engine" },
  { label: "Recommendations", href: "/optimization-engine/recommendations" },
  { label: "A/B Testing", href: "/optimization-engine/ab-testing" },
  { label: "Automations", href: "/optimization-engine/automations" },
  { label: "Performance Boosters", href: "/optimization-engine/performance-boosters" },
];

export default function ABTestingPage() {
  return (
    <div>
      <TopBar subtitle="Active tests across website, Google Ads, and Meta Ads." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card>
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-neutral text-left border-b border-slate-100">
                <th className="pb-2 font-medium">Test</th>
                <th className="pb-2 font-medium">Channel</th>
                <th className="pb-2 font-medium">Variant</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Expected Impact</th>
              </tr>
            </thead>
            <tbody>
              {abTestsList.map((t) => (
                <tr key={t.name} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{t.name}</td>
                  <td className="py-2.5 text-neutral">{t.channel}</td>
                  <td className="py-2.5 text-neutral">{t.variant}</td>
                  <td className="py-2.5"><Badge tone="success">{t.status}</Badge></td>
                  <td className="py-2.5 text-success">{t.expectedImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
