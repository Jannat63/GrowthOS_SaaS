"use client";
import { useState } from "react";
import { ArrowRight, Download, Lightbulb, Loader2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
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
import { useReport } from "@/lib/hooks/useReport";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

// Channel slugs (google_ads, meta_ads, …) → human labels. Falls back to Title Case.
const CHANNEL_LABEL: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  google_search_console: "Search Console",
  organic: "Organic Search",
};
function channelLabel(slug: string): string {
  return (
    CHANNEL_LABEL[slug] ??
    slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function IntelligencePage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: report } = useReport(workspaceId);
  const r = report?.data;

  const [downloading, setDownloading] = useState(false);
  async function downloadPdf() {
    if (!workspaceId) return;
    setDownloading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(
        `${base}/api/v1/workspaces/${workspaceId}/reports/weekly.pdf`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weekly-intelligence-${r?.weekStart ?? "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Weekly Intelligence Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Your cross-channel performance, opportunities, and budget moves for the week
            {r ? ` of ${r.weekStart}` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {report && <DataSourceBadge source={report.source} />}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
            disabled={!r || downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {!r ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <>
          {/* Headline metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Blended ROAS
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                {r.blendedRoas.toFixed(2)}x
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total revenue
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                {usd(r.totalRevenue)}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total spend
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
                {usd(r.totalSpend)}
              </p>
            </Card>
          </div>

          {/* Narrative summary */}
          <Card className="p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Summary
            </div>
            <p className="mt-3 text-sm leading-relaxed">{r.summary}</p>
          </Card>

          {/* Channel breakdown */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Channel breakdown
            </h2>
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.channelBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No channel data yet — connect a channel to populate your report.
                      </TableCell>
                    </TableRow>
                  ) : (
                    r.channelBreakdown.map((c) => (
                      <TableRow key={c.channel}>
                        <TableCell className="font-medium">{channelLabel(c.channel)}</TableCell>
                        <TableCell className="text-right tabular-nums">{usd(c.spend)}</TableCell>
                        <TableCell className="text-right tabular-nums">{usd(c.revenue)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Badge variant={c.roas >= r.blendedRoas ? "default" : "muted"}>
                            {c.roas.toFixed(2)}x
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </section>

          {/* Budget reallocation */}
          {r.budgetReallocation && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Suggested budget move
              </h2>
              <Card className="border-primary/30 bg-primary/5 p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Wallet className="h-3.5 w-3.5" />
                  Reallocation
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium">
                  <Badge variant="muted">{channelLabel(r.budgetReallocation.fromChannel)}</Badge>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                    {usd(r.budgetReallocation.amount)}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <Badge>{channelLabel(r.budgetReallocation.toChannel)}</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {r.budgetReallocation.reason}
                </p>
              </Card>
            </section>
          )}

          {/* Top opportunities */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Top opportunities
            </h2>
            {r.topOpportunities.length === 0 ? (
              <Card className="border-dashed p-8 text-center">
                <p className="text-sm font-medium">No open opportunities this week</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New cross-channel opportunities appear here as your data updates.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {r.topOpportunities.map((o, i) => (
                  <Card key={i} className="flex items-start gap-3 p-5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Lightbulb className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{o.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
