"use client";
import { ArrowDown, ArrowUp, Minus, Search } from "lucide-react";
import type { KeywordRanking } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
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
import { useKeywordRankings } from "@/lib/hooks/useKeywordRankings";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { cn } from "@/lib/utils/cn";

// Position is "lower is better", so invert the series — a rising line means improving rank.
function RankSparkline({ ranking }: { ranking: KeywordRanking }) {
  const values = ranking.series.map((p) => -p.position);
  if (values.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("h-7 w-full", ranking.change >= 0 ? "text-success" : "text-destructive")}
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChangeCell({ change }: { change: number }) {
  if (change === 0)
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3.5 w-3.5" /> 0
      </span>
    );
  const up = change > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", up ? "text-success" : "text-destructive")}>
      {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {Math.abs(change)}
    </span>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

export default function SeoPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: rankings } = useKeywordRankings(workspaceId);
  const r = rankings?.data;

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">SEO — Rank Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Keyword positions from Google Search Console, tracked over the last 30 days.
          </p>
        </div>
        {rankings && <DataSourceBadge source={rankings.source} />}
      </div>

      {!r ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Tracked keywords" value={r.summary.tracked} />
            <Tile label="Avg position" value={r.summary.avgPosition} />
            <Tile label="Top-3 keywords" value={r.summary.topThree} />
            <Tile label="Improved (7d)" value={r.summary.improved} />
          </div>

          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead className="text-right">Δ 7d</TableHead>
                  <TableHead className="text-right">Best</TableHead>
                  <TableHead className="w-32">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.keywords.map((k) => (
                  <TableRow key={k.keyword}>
                    <TableCell className="font-medium">{k.keyword}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={k.position <= 3 ? "success" : k.position <= 10 ? "default" : "muted"}>
                        {k.position}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <ChangeCell change={k.change} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{k.best}</TableCell>
                    <TableCell>
                      <RankSparkline ranking={k} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Connect Google Search Console in Settings to replace the sample data with your live rankings.
          </p>
        </>
      )}
    </div>
  );
}
