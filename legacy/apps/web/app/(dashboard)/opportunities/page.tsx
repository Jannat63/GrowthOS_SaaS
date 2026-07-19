import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { scoreKeywords } from "@/lib/logic/seo-scoring";
import { rawKeywords } from "@/lib/mock-data/seo";
import { analyzeSearchTerms } from "@/lib/logic/search-terms-bridge";
import { searchTerms } from "@/lib/mock-data/google-ads";
import { detectFatigueAll } from "@/lib/logic/creative-fatigue";
import { creatives } from "@/lib/mock-data/meta-ads";
import { generateCrossChannelRecommendations } from "@/lib/logic/cross-channel-engine";

export default function OpportunitiesPage() {
  const recs = generateCrossChannelRecommendations(
    scoreKeywords(rawKeywords),
    analyzeSearchTerms(searchTerms),
    detectFatigueAll(creatives)
  );

  return (
    <div>
      <TopBar subtitle="Every growth opportunity across SEO, Google Ads, and Meta Ads — ranked by impact." />
      <div className="p-6">
        <Card>
          <div className="text-heading-2 mb-4">All Opportunities ({recs.length})</div>
          <div className="space-y-3">
            {recs.map((r) => (
              <div key={r.id} className="flex items-start justify-between border border-slate-100 rounded-lg p-3">
                <div>
                  <div className="text-body font-medium">{r.title}</div>
                  <p className="text-caption text-neutral">{r.message}</p>
                </div>
                <Badge tone={r.impact === "High" ? "success" : r.impact === "Medium" ? "warning" : "neutral"}>
                  {r.impact}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
