"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { useOrganicTraffic } from "@/lib/hooks/useOrganicTraffic";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { SeoTile } from "@/components/seo/SeoTile";

const num = (n: number) => n.toLocaleString("en-US");

export function OrganicTraffic({ workspaceId }: { workspaceId: string | null }) {
  const { data: traffic } = useOrganicTraffic(workspaceId);
  const t = traffic?.data;

  if (!t) return <Skeleton className="h-64 w-full rounded-lg" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">{traffic && <DataSourceBadge source={traffic.source} platform={MODULE_PLATFORMS.seo} />}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SeoTile label="Clicks (30d)" value={num(t.summary.totalClicks)} />
        <SeoTile label="Impressions (30d)" value={num(t.summary.totalImpressions)} />
        <SeoTile label="Avg CTR" value={`${t.summary.avgCtr}%`} />
        <SeoTile label="Avg position" value={t.summary.avgPosition} />
      </div>

      <Card className="p-6 text-primary">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Organic clicks
        </h2>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={t.trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={24}
              />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={40} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--color-muted-foreground)" }}
                formatter={(v) => [num(Number(v)), "Clicks"]}
              />
              <Area type="monotone" dataKey="clicks" stroke="currentColor" strokeWidth={2} fill="url(#clicksFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Avg pos.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {t.pages.map((p) => (
              <TableRow key={p.pageUrl}>
                <TableCell className="max-w-[320px] truncate font-medium">{p.pageUrl}</TableCell>
                <TableCell className="text-right tabular-nums">{num(p.clicks)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {num(p.impressions)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.ctr}%</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {p.avgPosition}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
