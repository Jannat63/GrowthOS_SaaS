"use client";
import { useMemo } from "react";
import { Megaphone } from "lucide-react";
import type { CreativePlay, Recommendation, TopOrganicPage } from "@growthos/types";
import { isCreativeBrief } from "@growthos/logic";
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
import { PLAY_BLURB, PLAY_LABEL } from "@/components/creative/creativeText";

/** `own` first: the stronger organic position is the easier buy, so it leads. */
const PLAY_ORDER: CreativePlay[] = ["own", "claim"];

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
   * so the table listed the identical keywords as the cards below it.
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

  /**
   * Grouped by the play each brief runs, biggest demand first inside a group.
   *
   * A flat list was the honest shape when every brief was identical. Now that a brief's opening
   * depends on the organic position behind it, the grouping is the information: two keywords in
   * the same position genuinely warrant the same approach, and stacking them under a heading that
   * says so reads as deliberate rather than as the repetition it used to be.
   *
   * Briefs stored before plays existed have none, so they get their own trailing group rather than
   * being filed under a play nothing measured them for.
   */
  const groups = useMemo(() => {
    const byPlay = new Map<CreativePlay | null, Recommendation[]>();
    for (const rec of opportunities) {
      const brief = briefByRec.get(rec.id)?.brief;
      const play = (isCreativeBrief(brief) && brief.play) || null;
      const list = byPlay.get(play) ?? [];
      list.push(rec);
      byPlay.set(play, list);
    }
    for (const list of byPlay.values()) {
      list.sort(
        (a, b) => (pageByRec.get(b.id)?.volume ?? 0) - (pageByRec.get(a.id)?.volume ?? 0)
      );
    }
    const keys: (CreativePlay | null)[] = [
      ...PLAY_ORDER.filter((p) => byPlay.has(p)),
      ...(byPlay.has(null) ? [null] : []),
    ];
    return keys.map((play) => ({ play, recs: byPlay.get(play)! }));
  }, [opportunities, briefByRec, pageByRec]);

  const loading = !recs || !briefs;

  return (
    <div className="animate-rise space-y-10">
      {/*
        No channel eyebrow. An earlier pass put a "META CREATIVE" label here in `--channel-meta`,
        which added a second saturated hue beside the ember brand to say something the sidebar's
        active item and the sentence below already say. The page is identified by its own words.
      */}
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Creative Queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Topics your site already earns attention for, turned into Meta ads that put them in front
          of people who haven&rsquo;t searched yet.
        </p>
      </header>

      {/*
        The queue leads. It used to sit third, below the scorecard and an empty experiments log —
        so the page's entire job started below the fold while a "No experiments yet" panel held the
        space above it. The two supporting panels are context for this decision, so they follow it.
      */}
      <section className="space-y-5">
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

        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Card key={i} className="space-y-4 p-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                  <Skeleton className="h-64 w-full rounded-xl" />
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
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
          <div className="space-y-8">
            {groups.map(({ play, recs: inPlay }) => (
              <div key={play ?? "unsorted"} className="space-y-3">
                <div className="border-l-2 border-border pl-3">
                  {/* The count is a separate word to a screen reader, which read the margin-only
                      version as "Extend reach1". */}
                  <h3 className="text-sm font-semibold">
                    {play ? PLAY_LABEL[play] : "Briefed earlier"}{" "}
                    <span className="ml-1 font-mono text-xs font-normal tabular-nums text-muted-foreground">
                      {inPlay.length}
                    </span>
                  </h3>
                  <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                    {play
                      ? PLAY_BLURB[play]
                      : "Written before briefs recorded which play they run. Still valid — regenerate to sort them."}
                  </p>
                </div>

                <div className="space-y-4">
                  {inPlay.map((rec) => (
                    <CreativeBriefCard
                      key={rec.id}
                      rec={rec}
                      brief={briefByRec.get(rec.id)?.brief}
                      page={pageByRec.get(rec.id)}
                      workspaceId={workspaceId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How the creatives already running are doing — context for the decision above. */}
      <CreativeScorecard workspaceId={workspaceId} />
      <VariantExperiments workspaceId={workspaceId} />
    </div>
  );
}
