"use client";
import { useState } from "react";
import { GitBranch } from "lucide-react";
import type { AttributionModel } from "@growthos/logic";
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
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useAttribution } from "@/lib/hooks/useAttribution";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { cn } from "@/lib/utils/cn";

const MODELS: { key: AttributionModel; label: string }[] = [
  { key: "last_click", label: "Last click" },
  { key: "first_click", label: "First click" },
  { key: "linear", label: "Linear" },
  { key: "time_decay", label: "Time decay" },
  { key: "position_based", label: "Position-based" },
];

const CHANNEL_LABEL: Record<string, string> = {
  seo: "SEO",
  organic: "Organic",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  email: "Email",
};
const channelLabel = (c: string) => CHANNEL_LABEL[c] ?? c;
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function AttributionPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: attribution } = useAttribution(workspaceId);
  const a = attribution?.data;
  const [selected, setSelected] = useState<AttributionModel>("linear");

  return (
    <div className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Cross-channel attribution
          </h1>
          <p className="text-sm text-muted-foreground">
            How revenue credit shifts across channels under different attribution models.
          </p>
        </div>
        {attribution && <DataSourceBadge source={attribution.source} />}
      </div>

      {!a ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <>
          {/* Comparison matrix: each channel's attributed revenue under every model */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">Model comparison</h2>
            <Card className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      {MODELS.map((m) => (
                        <TableHead key={m.key} className="text-right">
                          {m.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.channels.map((channel) => (
                      <TableRow key={channel}>
                        <TableCell className="font-medium">{channelLabel(channel)}</TableCell>
                        {MODELS.map((m) => {
                          const credit = a.models[m.key].find((c) => c.channel === channel);
                          return (
                            <TableCell key={m.key} className="text-right tabular-nums">
                              {usd(credit?.revenue ?? 0)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
            <p className="text-xs text-muted-foreground">
              Last/first-click credit a single touch; linear splits evenly; time-decay favors closing
              touches; position-based weights the first and last at 40% each.
            </p>
          </section>

          {/* Focused single-model view */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelected(m.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    selected === m.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <Card className="space-y-3 p-6">
              {(() => {
                const credits = [...a.models[selected]].sort((x, y) => y.revenue - x.revenue);
                const max = Math.max(...credits.map((c) => c.revenue), 1);
                return credits.map((c) => (
                  <div key={c.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{channelLabel(c.channel)}</span>
                      <span className="tabular-nums">
                        {usd(c.revenue)}{" "}
                        <span className="text-muted-foreground">
                          · {c.conversions.toFixed(1)} conv.
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(c.revenue / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </Card>
          </section>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            Sample multi-touch paths — real paths populate as connected channels report conversions.
          </p>
        </>
      )}
    </div>
  );
}
