"use client";
import { Layers } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { useKeywordClusters } from "@/lib/hooks/useKeywordClusters";

export function KeywordClustersCard({ workspaceId }: { workspaceId: string | null }) {
  const { data: result, isLoading } = useKeywordClusters(workspaceId);
  const clusters = result?.data.clusters ?? [];

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Keyword clusters</h2>
        </div>
        {result && <DataSourceBadge source={result.source} platform={MODULE_PLATFORMS.seo} />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Groups your tracked keywords by topic, so you can see which content themes you're already
        covering — and where a whole topic is thin.
      </p>

      {isLoading ? (
        <Skeleton className="mt-6 h-32 w-full" />
      ) : clusters.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No tracked keywords yet — clusters will appear once keywords show up in your rank tracker.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {clusters.map((cluster) => (
            <div key={cluster.clusterName} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{cluster.clusterName}</p>
                <Badge variant="muted">{cluster.keywords.length}</Badge>
              </div>
              <ul className="mt-2 space-y-1">
                {cluster.keywords.map((kw) => (
                  <li key={kw} className="truncate text-xs text-muted-foreground">
                    {kw}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
