"use client";
import { Link2 } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import type { InternalLinkRecommendation } from "@growthos/types";
import { useInternalLinks } from "@/lib/hooks/useInternalLinks";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";

const PRIORITY_VARIANT: Record<InternalLinkRecommendation["priority"], "default" | "muted" | "outline"> = {
  high: "default",
  medium: "muted",
  low: "outline",
};

export function InternalLinkOptimizer({ workspaceId }: { workspaceId: string | null }) {
  const { data } = useInternalLinks(workspaceId);
  const recs = data?.data.recommendations ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Internal link optimizer</h2>
        {data && <DataSourceBadge source={data.source} platform={MODULE_PLATFORMS.seo} />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Keywords ranking #4–15 — close enough to page 1&apos;s top results that a well-placed internal link can help close the gap.
      </p>

      {!data ? (
        <Skeleton className="mt-4 h-48 w-full" />
      ) : recs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No striking-distance opportunities right now — nothing is currently ranking #4–15 with a matching tracked page.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {recs.map((r) => (
            <div key={`${r.sourcePage}->${r.targetPage}`} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={PRIORITY_VARIANT[r.priority]} className="capitalize">
                  {r.priority} priority
                </Badge>
                <span className="text-xs text-muted-foreground">Position #{r.currentPosition}</span>
              </div>
              <p className="mt-2 text-sm">
                Link <span className="font-medium">{r.sourcePage}</span> →{" "}
                <span className="font-medium">{r.targetPage}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Suggested anchor text: <code className="rounded bg-muted px-1 py-0.5">{r.anchorText}</code>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{r.reason}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
