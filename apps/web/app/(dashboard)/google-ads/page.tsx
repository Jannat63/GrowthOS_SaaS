"use client";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useCampaignInsights } from "@/lib/hooks/useCampaignInsights";
import { useGrowthHub } from "@/lib/hooks/useGrowthHub";
import { useRangeStore } from "@/lib/stores/range";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { CampaignInsightsPanel } from "@/components/ads/CampaignInsightsPanel";
import { RsaGenerator } from "@/components/google-ads/RsaGenerator";
import { BudgetPlanner } from "@/components/google-ads/BudgetPlanner";

export default function GoogleAdsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const range = useRangeStore((s) => s.range);
  const { data: hub } = useGrowthHub(workspaceId, range);
  const { data: insights } = useCampaignInsights(workspaceId, range);
  const d = insights?.data;

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Google Ads</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Where your Google Ads budget is working, where it is being wasted, and the numbers your
            targets should hit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {insights && (
            <DataSourceBadge source={insights.source} platform={MODULE_PLATFORMS.googleAds} />
          )}
          <DateRangePicker
            dataFrom={hub?.data.dataFrom}
            dataThrough={hub?.data.dataThrough}
            activeRange={hub?.data.window}
          />
        </div>
      </div>

      {!d ? (
        <div className="space-y-6">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <>
          <CampaignInsightsPanel
            campaigns={d.campaigns}
            wastedSpend={d.wastedSpend}
            summary={d.summary}
            period={d.period}
          />
          <BudgetPlanner />
          <RsaGenerator workspaceId={workspaceId} />
        </>
      )}
    </div>
  );
}
