"use client";
import { Check, X, Clock, Megaphone } from "lucide-react";
import type { CreativeBrief } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useTopPages } from "@/lib/hooks/useTopPages";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useContentBriefs } from "@/lib/hooks/useContentBriefs";
import { useRecommendationActions } from "@/lib/hooks/useRecommendationActions";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { CreativeScorecard } from "@/components/creative/CreativeScorecard";
import { VariantExperiments } from "@/components/creative/VariantExperiments";

export default function CreativeQueuePage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: pages } = useTopPages(workspaceId);
  const { data: recs } = useRecommendations(workspaceId);
  const { data: briefs } = useContentBriefs(workspaceId);
  const actions = useRecommendationActions(workspaceId);

  const briefByRec = new Map((briefs?.data ?? []).map((b) => [b.recommendationId, b]));
  const opportunities = (recs?.data ?? []).filter(
    (r) => r.type === "organic_to_paid" && r.status === "pending"
  );

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Creative Queue</h1>
        <p className="text-sm text-muted-foreground">
          Top organic pages turned into Meta creative briefs — amplify proven demand with paid.
        </p>
      </div>

      {/* Placed above the brief queue on purpose: how the creatives already running are doing is
          the context for deciding what to make next. */}
      <CreativeScorecard workspaceId={workspaceId} />

      {/* Sits with the scorecard: both are about creatives already in flight, as opposed to the
          brief queue below, which is about what to make next. */}
      <VariantExperiments workspaceId={workspaceId} />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Top organic pages</h2>
          {pages && <DataSourceBadge source={pages.source} platform={MODULE_PLATFORMS.organicToPaid} />}
        </div>
        <Card className="p-0">
          {pages ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Volume/mo</TableHead>
                  <TableHead className="text-right">Organic pos.</TableHead>
                  <TableHead className="text-right">Opportunity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.data.map((p) => (
                  <TableRow key={p.keyword}>
                    <TableCell className="font-medium">{p.keyword}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.volume.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.currentPosition ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Math.round(p.opportunityScore)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Creative opportunities</h2>
        {!recs ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : opportunities.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm font-medium">No open creative opportunities</p>
            <p className="mt-1 text-sm text-muted-foreground">
              As organic pages prove demand, Meta creative briefs appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((rec) => {
              const brief = briefByRec.get(rec.id)?.brief as unknown as CreativeBrief | undefined;
              return (
                <Card key={rec.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{rec.body}</p>
                    </div>
                    <Badge variant="muted">Impact {rec.impactScore}</Badge>
                  </div>

                  {brief && (
                    <div className="mt-4 rounded-lg border bg-secondary/40 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Megaphone className="h-3.5 w-3.5" />
                        Meta creative brief
                      </div>
                      <p className="mt-2 text-sm font-medium">{brief.hook}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{brief.primaryText}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {brief.format} · {brief.audience} · CTA: {brief.callToAction}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => actions.mutate({ id: rec.id, status: "acted" })}
                      disabled={actions.isPending}
                    >
                      <Check className="h-4 w-4" /> Act
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => actions.mutate({ id: rec.id, status: "snoozed" })}
                      disabled={actions.isPending}
                    >
                      <Clock className="h-4 w-4" /> Snooze
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => actions.mutate({ id: rec.id, status: "dismissed" })}
                      disabled={actions.isPending}
                    >
                      <X className="h-4 w-4" /> Dismiss
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
