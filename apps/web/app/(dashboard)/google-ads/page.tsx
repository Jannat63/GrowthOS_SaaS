"use client";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useCampaignInsights } from "@/lib/hooks/useCampaignInsights";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { CampaignInsightsPanel } from "@/components/ads/CampaignInsightsPanel";
import { RsaGenerator } from "@/components/google-ads/RsaGenerator";
import { BudgetPlanner } from "@/components/google-ads/BudgetPlanner";

export default function GoogleAdsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: insights } = useCampaignInsights(workspaceId);
  const d = insights?.data;

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Google Ads</h1>
          <p className="text-sm text-muted-foreground">
            Campaign efficiency, wasted-spend detection, and ad copy — all deterministic, no AI.
          </p>
        </div>
        {insights && <DataSourceBadge source={insights.source} platform={MODULE_PLATFORMS.googleAds} />}
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
          <BudgetPlanner />
          <RsaGenerator workspaceId={workspaceId} />
        </>
      )}
    </div>
  );
}
