"use client";
import { useState } from "react";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useMetaCampaignInsights } from "@/lib/hooks/useCampaignInsights";
import { useGrowthHub } from "@/lib/hooks/useGrowthHub";
import { useRangeStore, rangeLength } from "@/lib/stores/range";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { CampaignInsightsPanel } from "@/components/ads/CampaignInsightsPanel";
import { FunnelPlanner } from "@/components/meta-ads/FunnelPlanner";
import { AdCopyStudio } from "@/components/meta-ads/AdCopyStudio";

export default function MetaAdsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  // Shared with every other module rather than local state: someone who picks 90d on Analytics and
  // opens this page is still asking about 90d.
  const range = useRangeStore((s) => s.range);
  const { data: hub } = useGrowthHub(workspaceId, range);
  const { data: insights } = useMetaCampaignInsights(workspaceId, range);

  /**
   * What is being advertised — ONE field for the whole page.
   *
   * The funnel planner and the copy studio each had their own "Product" input, defaulting to
   * "Ergonomic Office Chair" and "Ergonomic Chair" respectively: two controls for one fact,
   * disagreeing out of the box, on the same screen.
   */
  const [product, setProduct] = useState("Ergonomic Office Chair");

  const d = insights?.data;

  /** Spend normalised to a month, so the planner starts from what the account actually runs at. */
  const monthlySpend =
    d && d.period && d.summary.totalSpend > 0
      ? (d.summary.totalSpend / rangeLength(d.period)) * 30
      : null;

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Meta Ads</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Which campaigns are earning their budget, how to split the next month across cold, warm
            and hot audiences, and the copy to run.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {insights && (
            <DataSourceBadge source={insights.source} platform={MODULE_PLATFORMS.metaAds} />
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

          {/*
            The second half of the page is a different activity from the first: above is what the
            account DID, below is what to do next. It read as two unrelated tools stacked under a
            floating heading with a "Product" field orphaned off to the right — the reader had no
            reason to think the funnel split and the ad copy belonged together, or that the field
            drove both.

            They are two steps of one decision, so they are numbered and named as such, and the fact
            they share sits at the top where it is read first rather than beside the heading.
          */}
          <section className="space-y-4 border-t pt-8">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                What to do next month
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Two decisions follow from the numbers above: how to divide the budget, and what the
                ads should say. Both start from the product you are advertising.
              </p>
              <div className="mt-4 grid w-full max-w-sm gap-1.5">
                <Label htmlFor="meta-product">Product</Label>
                <Input
                  id="meta-product"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Ergonomic Office Chair"
                />
              </div>
            </div>

            {/*
              Deliberately NOT numbered "01 / 02". The two are independent tools that happen to
              share an input — you can write copy without touching the split — so a step marker
              would assert an order the product does not have. Each card states its own purpose in
              its first line instead, which is the thing that was actually missing.
            */}
            <FunnelPlanner product={product} monthlySpend={monthlySpend} />
            <AdCopyStudio workspaceId={workspaceId} product={product} />
          </section>
        </>
      )}
    </div>
  );
}
