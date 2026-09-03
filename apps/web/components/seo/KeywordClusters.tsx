"use client";
import { Info } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useKeywordClusters } from "@/lib/hooks/useKeywordClusters";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { SeoTile } from "@/components/seo/SeoTile";

export function KeywordClusters({ workspaceId }: { workspaceId: string | null }) {
  const { data: clusters } = useKeywordClusters(workspaceId);
  const c = clusters?.data;

  if (!c) return <Skeleton className="h-64 w-full rounded-lg" />;

  const anyVerified = c.clusters.some((cluster) => cluster.intentVerified);
  const grouped = c.clusters.filter((cluster) => cluster.keywords.length > 1);
  const ungrouped = c.clusters.filter((cluster) => cluster.keywords.length === 1);
  const groupedKeywordCount = grouped.reduce((n, cluster) => n + cluster.keywords.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {clusters && <DataSourceBadge source={clusters.source} platform={MODULE_PLATFORMS.seo} />}
      </div>

      {/*
        Counted from what this page actually shows, not from `summary`.

        `summary.clusters` counts every cluster including one-keyword ones — 7 on the sample data —
        while the body below deliberately separates those out and calls them "Ungrouped", so the
        tile and the page disagreed about how many topics exist. `summary.keywords` is the total
        tracked count (8) and was labelled "Keywords grouped" when only 2 keywords are in a topic.
        Both tiles described a different page from the one underneath them.
      */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SeoTile label="Topics found" value={grouped.length} />
        <SeoTile label="Keywords in a topic" value={groupedKeywordCount} />
        <SeoTile label="Largest topic" value={c.summary.largestCluster} />
        <SeoTile label="Not grouped" value={ungrouped.length} />
      </div>

      {/*
        This notice is not decoration and should not be quietly dropped. These clusters are grouped
        by shared words, which cannot see intent that only appears in the search results — "how to
        clean running shoes" and "best running shoes" land together and serve different intents.
        Presenting them as though the search engine agreed would be the same class of error as
        showing seeded data as the customer's own numbers.
      */}
      {!anyVerified && (
        <Card className="flex items-start gap-3 border-dashed p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Grouped by wording, not by intent.</span>{" "}
            These clusters come from the words your keywords share. Two keywords can read alike and
            still want completely different pages, so treat a cluster as a starting point rather than
            a decision. Verifying intent needs live search-results data, which isn&apos;t connected yet.
          </p>
        </Card>
      )}

      {/*
        Clusters of one are separated out rather than rendered as six identical one-item cards.
        With a small, topically-diverse keyword set most keywords have no neighbour — the shipped
        sample data groups 2 of 8 — and giving each its own card implies a grouping that isn't
        there while burying the one cluster that is. The threshold is deliberately NOT lowered to
        make this page look busier: that would merge keywords the algorithm does not actually think
        belong together.
      */}
      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map((cluster) => (
          <Card key={cluster.clusterName + cluster.keywords[0]?.keyword} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {cluster.clusterName}
              </h3>
              <div className="flex items-center gap-2">
                {cluster.intentVerified && <Badge variant="success">Intent verified</Badge>}
                <Badge variant="muted">
                  {cluster.keywords.length} {cluster.keywords.length === 1 ? "keyword" : "keywords"}
                </Badge>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Average position {cluster.avgPosition}
            </p>
            <ul className="mt-4 space-y-2">
              {cluster.keywords.map((k) => (
                <li key={k.keyword} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{k.keyword}</span>
                  <Badge
                    variant={k.position <= 3 ? "success" : k.position <= 10 ? "outline" : "muted"}
                  >
                    {k.position}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {ungrouped.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold tracking-tight">Ungrouped</h3>
            <Badge variant="muted">{ungrouped.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            No other tracked keyword shares enough wording with these to form a topic.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {ungrouped.map((cluster) => (
              <li
                key={cluster.clusterName}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate">{cluster.keywords[0]?.keyword}</span>
                <Badge
                  variant={
                    (cluster.keywords[0]?.position ?? 0) <= 3
                      ? "success"
                      : (cluster.keywords[0]?.position ?? 0) <= 10
                        ? "outline"
                        : "muted"
                  }
                >
                  {cluster.keywords[0]?.position}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
