"use client";
import { useMemo } from "react";
import { Megaphone } from "lucide-react";
import type { TopOrganicPage } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useTopPages } from "@/lib/hooks/useTopPages";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useContentBriefs } from "@/lib/hooks/useContentBriefs";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { CreativeScorecard } from "@/components/creative/CreativeScorecard";
import { VariantExperiments } from "@/components/creative/VariantExperiments";
import { CreativeBriefCard } from "@/components/creative/CreativeBriefCard";

export default function CreativeQueuePage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: pages } = useTopPages(workspaceId);
  const { data: recs } = useRecommendations(workspaceId);
  const { data: briefs } = useContentBriefs(workspaceId);

  const briefByRec = useMemo(
    () => new Map((briefs?.data ?? []).map((b) => [b.recommendationId, b])),
    [briefs]
  );

  // Snoozed opportunities were filtered out entirely with no view anywhere, so snoozing something
  // removed it from the product's memory rather than deferring it.
  const opportunities = useMemo(
    () =>
      (recs?.data ?? []).filter(
        (r) =>
          r.type === "organic_to_paid" && (r.status === "pending" || r.status === "snoozed")
      ),
    [recs]
  );

  /**
   * The organic page behind each opportunity.
   *
   * This used to be a standalone "Top organic pages" table sitting above the cards — but
   * `getTopOrganicPages()` and `ensureOrganicToPaid()` both call the same `topKeywords()` filter,
   * so the table listed the identical keywords as the cards below it. Half the page restated the
   * other half. The three figures move onto the card they justify, and the table is gone.
   */
  const pageByRec = useMemo(() => {
    const byKeyword = new Map((pages?.data ?? []).map((p) => [p.keyword, p]));
    const out = new Map<string, TopOrganicPage>();
    for (const rec of opportunities) {
      const keyword = briefByRec.get(rec.id)?.keyword;
      const p = keyword ? byKeyword.get(keyword) : undefined;
      if (p) out.set(rec.id, p);
    }
    return out;
  }, [pages, opportunities, briefByRec]);

  return (
    <div className="animate-rise space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Creative Queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Topics your site already earns attention for, turned into Meta ads that put them in front
          of people who haven&rsquo;t searched yet.
        </p>
      </header>

      {/* How the creatives already running are doing — the context for deciding what to make next. */}
      <CreativeScorecard workspaceId={workspaceId} />
      <VariantExperiments workspaceId={workspaceId} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Ready to build
          </h2>
          {recs && (
            <span className="font-mono text-xs tabular-nums text-foreground/60">
              {opportunities.length}
            </span>
          )}
          {pages && (
            <DataSourceBadge source={pages.source} platform={MODULE_PLATFORMS.organicToPaid} />
          )}
        </div>

        {!recs || !briefs ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Card key={i} className="space-y-3 p-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-28 w-full" />
              </Card>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <Megaphone className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Nothing to build right now</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              When a page starts ranking well for a term with real search volume, a Meta creative
              brief for it appears here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((rec) => (
              <CreativeBriefCard
                key={rec.id}
                rec={rec}
                brief={briefByRec.get(rec.id)?.brief}
                page={pageByRec.get(rec.id)}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
