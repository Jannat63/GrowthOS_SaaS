"use client";
import { useMemo, useState } from "react";
import {
  attributionSpread,
  channelRoles,
  pathsRevenue,
  type AttributionModel,
} from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useAttribution } from "@/lib/hooks/useAttribution";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { MODULE_PLATFORMS } from "@/lib/hooks/useDataProvenance";
import { CreditSpread } from "@/components/attribution/CreditSpread";
import { ModelPicker } from "@/components/attribution/ModelPicker";
import { ModelMatrix } from "@/components/attribution/ModelMatrix";
import { PathLedger } from "@/components/attribution/PathLedger";
import { usd } from "@/components/attribution/models";

/**
 * Cross-channel attribution.
 *
 * The page is built around one question — *how much of a channel's credit is a
 * property of the model rather than of the business* — because that is the only
 * question the five models together can answer. Any single model's numbers are
 * available from the platform that reported them; the disagreement between them
 * is not, and it is what decides whether a budget split is trustworthy.
 *
 * Everything below re-expresses one piece of state, the selected model: the
 * marker positions in the chart, the weights printed on each path, and the lit
 * column in the table. That is why the accent colour is spent on the selection
 * and on nothing else.
 */
export default function AttributionPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: attribution } = useAttribution(workspaceId);
  const a = attribution?.data;
  // Linear is the default because it is the only model that takes no position on
  // which touch mattered; the page's argument is that the choice is a choice.
  const [selected, setSelected] = useState<AttributionModel>("linear");

  const paths = useMemo(() => a?.paths ?? [], [a]);

  // From the paths, so rounding in the per-channel credits cannot make the totals
  // row disagree with itself between columns. The fallback covers a response
  // cached before the endpoint returned paths: summing a model's credits lands a
  // cent off the true pot, which is invisible at whole-dollar precision and much
  // better than a page that divides by zero.
  const totalRevenue = useMemo(() => {
    const fromPaths = pathsRevenue(paths);
    if (fromPaths > 0) return fromPaths;
    return a?.models.linear.reduce((sum, c) => sum + c.revenue, 0) ?? 0;
  }, [paths, a]);

  const spread = useMemo(
    () => (a ? attributionSpread(a.models, totalRevenue) : []),
    [a, totalRevenue],
  );
  const roles = useMemo(() => channelRoles(paths), [paths]);

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Cross-channel attribution
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The same conversions, divided five ways. Where the models disagree is where a budget
            decision is least safe.
          </p>
          {spread.length > 0 && (
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {paths.length || "—"} conversion paths · {usd(totalRevenue)} · {spread.length} channels
            </p>
          )}
        </div>
        {attribution && (
          <DataSourceBadge
            source={attribution.source}
            platform={MODULE_PLATFORMS.attribution}
          />
        )}
      </div>

      {!a ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : spread.length === 0 ? (
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            No conversion paths yet
          </h2>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Attribution needs conversions that touched at least one channel. Paths appear here as
            your connected channels start reporting them — connect a channel in Settings to begin
            collecting.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <ModelPicker selected={selected} onSelect={setSelected} />
          </Card>

          <CreditSpread
            spread={spread}
            roles={roles}
            selected={selected}
            totalRevenue={totalRevenue}
            pathCount={paths.length}
          />

          {paths.length > 0 && <PathLedger paths={paths} selected={selected} />}

          <ModelMatrix
            spread={spread}
            selected={selected}
            onSelect={setSelected}
            totalRevenue={totalRevenue}
          />
        </>
      )}
    </div>
  );
}
