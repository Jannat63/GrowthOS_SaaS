"use client";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { CampaignInsight, CampaignSummary, WastedSpendFinding } from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { cn } from "@/lib/utils/cn";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const STATUS: Record<CampaignInsight["status"], { label: string; className: string }> = {
  wasted: { label: "Wasted", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  scale: { label: "Scale", className: "border-transparent bg-success/10 text-success" },
  healthy: { label: "Healthy", className: "border-transparent bg-muted text-muted-foreground" },
};

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

// Shared campaign-insights surface for the Google Ads + Meta Ads modules: summary tiles, a
// wasted-spend panel, and a per-campaign table with status + recommendation. Channel-agnostic —
// both are computed by the same @growthos/logic advisor.
export function CampaignInsightsPanel({
  campaigns,
  wastedSpend,
  summary,
}: {
  campaigns: CampaignInsight[];
  wastedSpend: WastedSpendFinding[];
  summary: CampaignSummary;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total spend" value={usd(summary.totalSpend)} />
        {/*
          NOT "Blended ROAS". This is one channel's revenue over one channel's spend — the panel is
          shared by the Google Ads and Meta Ads pages and reports only the campaigns beside it.
          "Blended" already means something specific and different in this product: the Intelligence
          report's `blendedMer` is ALL revenue over ad spend, and the two figures differ by
          REVENUE_FACTOR. Using the same word for both is the exact confusion that audit fixed.
        */}
        <Tile label="Account ROAS" value={`${summary.blendedRoas.toFixed(2)}x`} />
        <Tile label="Wasted campaigns" value={summary.wastedCount} />
        <Tile label="Scale opportunities" value={summary.scaleCount} />
      </div>

      {wastedSpend.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Wasted spend detected
          </div>
          <ul className="mt-3 space-y-2">
            {wastedSpend.map((f, i) => (
              <li key={i} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <span className="font-medium">{f.campaign}</span>
                  <span className="text-muted-foreground"> — {f.issue}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums font-medium">{usd(f.wastedSpend)}</span>
                  <Badge variant={f.severity === "High" ? "default" : "muted"}>{f.severity}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Campaigns
        </h2>
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.recommendation}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usd(c.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.conversions}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.cpa > 0 ? usd(c.cpa) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.roas.toFixed(2)}x</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        STATUS[c.status].className
                      )}
                    >
                      {STATUS[c.status].label}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
