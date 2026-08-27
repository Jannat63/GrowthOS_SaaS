"use client";
import { Megaphone } from "lucide-react";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useMetaCampaignInsights } from "@/lib/hooks/useMetaCampaignInsights";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { CampaignInsightsPanel } from "@/components/ads/CampaignInsightsPanel";
import { FunnelPlanner } from "@/components/meta-ads/FunnelPlanner";
import { AdCopyStudio } from "@/components/meta-ads/AdCopyStudio";

export default function MetaAdsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: insights } = useMetaCampaignInsights(workspaceId);
  const d = insights?.data;

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Meta Ads</h1>
          <p className="text-sm text-muted-foreground">
            Campaign efficiency, full-funnel planning, and ad copy — all deterministic, no AI.
          </p>
        </div>
        {insights && <DataSourceBadge source={insights.source} platform={MODULE_PLATFORMS.metaAds} />}
      </div>

      {!d ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <>
          <CampaignInsightsPanel
            campaigns={d.campaigns}
            wastedSpend={d.wastedSpend}
            summary={d.summary}
          />
          <FunnelPlanner />
          <AdCopyStudio workspaceId={workspaceId} />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Megaphone className="h-3.5 w-3.5" />
            Live campaign sync &amp; publishing arrive once your Meta app clears App Review.
          </p>
        </>
      )}
    </div>
  );
}
