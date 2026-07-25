"use client";
import { Check, X, Clock, FileText } from "lucide-react";
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
import { useSearchTerms } from "@/lib/hooks/useSearchTerms";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useContentBriefs } from "@/lib/hooks/useContentBriefs";
import { useRecommendationActions } from "@/lib/hooks/useRecommendationActions";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

const TERM_TAG: Record<string, { label: string; variant: "default" | "muted" | "outline" }> = {
  "paid-proven-organic-needed": { label: "Content opportunity", variant: "default" },
  "reduce-bid-organic-covers": { label: "Reduce bid", variant: "muted" },
  monitor: { label: "Monitor", variant: "outline" },
};

export default function ContentPipelinePage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: terms } = useSearchTerms(workspaceId);
  const { data: recs } = useRecommendations(workspaceId);
  const { data: briefs } = useContentBriefs(workspaceId);
  const actions = useRecommendationActions(workspaceId);

  const briefByRec = new Map((briefs?.data ?? []).map((b) => [b.recommendationId, b]));
  const opportunities = (recs?.data ?? []).filter(
    (r) => r.type === "paid_to_organic" && r.status === "pending"
  );

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Content Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Paid search terms that convert but have no organic coverage — turn them into content.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Search terms</h2>
          {terms && <DataSourceBadge source={terms.source} />}
        </div>
        <Card className="p-0">
          {terms ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">Conv. rate</TableHead>
                  <TableHead className="text-right">Organic pos.</TableHead>
                  <TableHead>Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.data.map((t) => {
                  const tag = TERM_TAG[t.recommendationType] ?? TERM_TAG.monitor;
                  return (
                    <TableRow key={t.term}>
                      <TableCell className="font-medium">{t.term}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.conversions}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(t.conversionRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.organicPosition ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tag.variant}>{tag.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Content opportunities
        </h2>
        {!recs ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : opportunities.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm font-medium">No open content opportunities</p>
            <p className="mt-1 text-sm text-muted-foreground">
              As paid search terms convert without organic coverage, briefs appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((rec) => {
              const brief = briefByRec.get(rec.id);
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
                        <FileText className="h-3.5 w-3.5" />
                        Content brief
                      </div>
                      <p className="mt-2 text-sm font-medium">{brief.brief.recommendedH1}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ~{brief.brief.wordCount} words · {brief.brief.headingStructure.length} sections ·{" "}
                        {brief.brief.schemaType}
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
