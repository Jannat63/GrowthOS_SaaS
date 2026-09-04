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
import type { OrganicTrafficResponse } from "@growthos/types";
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
import { FigureList, type Figure } from "@/components/FigureList";

const num = (n: number) => n.toLocaleString("en-US");

type Page = OrganicTrafficResponse["pages"][number];

/**
 * The four numeric columns, defined once.
 *
 * The header, the table cells and the record below all read this, so the wide layout and the
 * narrow one cannot end up calling a column two different things or ordering them differently.
 */
const COLUMNS: { key: string; label: string; value: (p: Page) => React.ReactNode }[] = [
  { key: "clicks", label: "Clicks", value: (p) => num(p.clicks) },
  {
    key: "impressions",
    label: "Impressions",
    value: (p) => <span className="text-muted-foreground">{num(p.impressions)}</span>,
  },
  { key: "ctr", label: "CTR", value: (p) => `${p.ctr}%` },
  {
    key: "position",
    label: "Avg pos.",
    value: (p) => <span className="text-muted-foreground">{p.avgPosition}</span>,
  },
];

const figuresFor = (p: Page): Figure[] =>
  COLUMNS.map((c) => ({ key: c.key, label: c.label, value: c.value(p) }));

/**
 * "18 Jun – 17 Jul", from the window the figures were actually measured over.
 *
 * The tiles used to be hard-labelled "(30d)" while the API summed every seeded day. Reading the
 * period off the response means the label cannot drift from the number again — and it says *which*
 * 30 days, which matters on seeded or lagging data where the newest row is weeks behind today.
 */
function periodLabel(period: OrganicTrafficResponse["period"]): string | null {
  if (!period || !period.from || !period.to) return null;
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(period.from)} – ${fmt(period.to)}`;
}

export function OrganicTraffic({ workspaceId }: { workspaceId: string | null }) {
  const { data: traffic } = useOrganicTraffic(workspaceId);
  const t = traffic?.data;

  if (!t) return <Skeleton className="h-64 w-full rounded-lg" />;

  const period = periodLabel(t.period);

  return (
    // Measured against this column rather than the viewport: the four numeric columns plus a page
    // URL need ~36rem, which 768px does not give once the sidebar takes its 240px.
    <div className="@container space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {period ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {period}
          </p>
        ) : (
          <span />
        )}
        {traffic && <DataSourceBadge source={traffic.source} platform={MODULE_PLATFORMS.seo} />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SeoTile label="Clicks" value={num(t.summary.totalClicks)} />
        <SeoTile label="Impressions" value={num(t.summary.totalImpressions)} />
        <SeoTile label="Avg CTR" value={`${t.summary.avgCtr}%`} />
        <SeoTile label="Avg position" value={t.summary.avgPosition} />
      </div>

      <Card className="p-6 text-channel-seo">
        {/*
          Coloured with the SEO channel token rather than --primary. BrandingProvider overwrites
          --primary per workspace for white-labelling, so a chart keyed to it changes hue with the
          tenant and can land somewhere illegible; --channel-seo is the same colour this channel
          carries everywhere else in the product.
        */}
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

      {/* Narrow: one record per page. `break-all` rather than `truncate` — a URL cut at 320px
          usually loses the path, which is the only part that identifies the page. */}
      <Card className="divide-y @xl:hidden">
        {t.pages.map((p) => (
          <div key={p.pageUrl} className="p-4">
            <p className="break-all text-sm font-medium">{p.pageUrl}</p>
            <FigureList figures={figuresFor(p)} className="mt-3 border-t pt-3" />
          </div>
        ))}
      </Card>

      <Card className="hidden p-0 @xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className="text-right">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {t.pages.map((p) => (
              <TableRow key={p.pageUrl}>
                <TableCell className="max-w-[320px] truncate font-medium" title={p.pageUrl}>
                  {p.pageUrl}
                </TableCell>
                {COLUMNS.map((c) => (
                  <TableCell key={c.key} className="text-right tabular-nums">
                    {c.value(p)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
