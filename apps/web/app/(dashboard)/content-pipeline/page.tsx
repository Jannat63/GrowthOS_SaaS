"use client";
import { useMemo } from "react";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useSearchTerms } from "@/lib/hooks/useSearchTerms";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useContentBriefs } from "@/lib/hooks/useContentBriefs";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { BriefCard } from "@/components/content-pipeline/BriefCard";
import { SearchTermsTable } from "@/components/content-pipeline/SearchTermsTable";
import { STAGES } from "@/components/content-pipeline/stages";
import { usdPrecise } from "@/components/content-pipeline/briefText";

const OPPORTUNITY = "paid-proven-organic-needed";

export default function ContentPipelinePage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: terms } = useSearchTerms(workspaceId);
  const { data: recs } = useRecommendations(workspaceId);
  const { data: briefs } = useContentBriefs(workspaceId);

  const allTerms = useMemo(() => terms?.data ?? [], [terms]);
  const briefByRec = useMemo(
    () => new Map((briefs?.data ?? []).map((b) => [b.recommendationId, b])),
    [briefs]
  );

  // Snoozed opportunities were filtered out entirely with no view anywhere, so snoozing something
  // here deleted it from the user's perspective. They stay, marked.
  const opportunities = useMemo(
    () =>
      (recs?.data ?? []).filter(
        (r) =>
          r.type === "paid_to_organic" && (r.status === "pending" || r.status === "snoozed")
      ),
    [recs]
  );

  /** The search term behind each opportunity — matched on the keyword its brief was built from. */
  const termByRecId = useMemo(() => {
    const byTerm = new Map(allTerms.map((t) => [t.term, t]));
    const out = new Map<string, (typeof allTerms)[number]>();
    for (const rec of opportunities) {
      const keyword = briefByRec.get(rec.id)?.keyword;
      const t = keyword ? byTerm.get(keyword) : undefined;
      if (t) out.set(rec.id, t);
    }
    return out;
  }, [allTerms, opportunities, briefByRec]);

  /** term -> recommendation id, so a table row can jump to the brief it produced. */
  const briefAnchors = useMemo(() => {
    const out = new Map<string, string>();
    for (const [recId, t] of termByRecId) out.set(t.term, recId);
    return out;
  }, [termByRecId]);

  // Scoped to the terms on screen rather than a time window: the search-term endpoint returns no
  // date range at all, so any claim about a period would be one the data cannot support.
  const opportunityTerms = allTerms.filter((t) => t.recommendationType === OPPORTUNITY);
  const spent = opportunityTerms.reduce((s, t) => s + t.cost, 0);
  const converted = opportunityTerms.reduce((s, t) => s + t.conversions, 0);

  const stageCounts = STAGES.map((s) => ({
    ...s,
    count: (briefs?.data ?? []).filter((b) => b.status === s.key).length,
  }));

  return (
    <div className="animate-rise space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Content Pipeline</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Search terms that convert on paid but rank nowhere organically. Each one is an article
          you haven&rsquo;t written — and rent you keep paying until you do.
        </p>
      </header>

      {/* The thesis, in the numbers that make it. */}
      {terms && opportunityTerms.length > 0 && (
        <Card className="flex flex-wrap items-baseline gap-x-8 gap-y-3 p-5">
          <Figure value={usdPrecise(spent)} label="Spent on terms you don't rank for" />
          <Figure value={String(converted)} label="Conversions they produced" />
          <Figure value={String(opportunityTerms.length)} label="Articles that would earn them" />
          <p className="basis-full text-xs text-muted-foreground">
            Measured across the search terms below.
          </p>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SectionHeading>Search terms</SectionHeading>
          {terms && (
            <DataSourceBadge source={terms.source} platform={MODULE_PLATFORMS.paidToOrganic} />
          )}
        </div>
        <Card className="overflow-x-auto p-0">
          {terms ? (
            <SearchTermsTable terms={allTerms} briefAnchors={briefAnchors} />
          ) : (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <SectionHeading>The pipeline</SectionHeading>
          {briefs && briefs.data.length > 0 && (
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {stageCounts.map((s, i) => (
                <span key={s.key}>
                  {i > 0 && <span className="mx-1.5 opacity-40">·</span>}
                  {s.label}{" "}
                  <span className="tabular-nums text-foreground/70">{s.count}</span>
                </span>
              ))}
            </p>
          )}
        </div>

        {!recs || !briefs ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Card key={i} className="space-y-3 p-5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </Card>
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <p className="text-sm font-medium">Nothing to write right now</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              When a paid search term converts without organic coverage, a brief for it appears
              here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((rec) => (
              <BriefCard
                key={rec.id}
                rec={rec}
                brief={briefByRec.get(rec.id)}
                term={termByRecId.get(rec.id)}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
