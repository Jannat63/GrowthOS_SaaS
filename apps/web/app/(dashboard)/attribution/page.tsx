"use client";
import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  attributionSpread,
  channelRoles,
  pathsRevenue,
  type AttributionModel,
} from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@growthos/ui/components/tabs";
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

const TABS = ["spread", "paths", "models"] as const;
type Tab = (typeof TABS)[number];

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
 *
 * **The model is the lens; the tab is the view.** The picker sits above the tab
 * strip rather than inside a panel because it applies to all three views at once
 * — switching view while holding the model fixed is the whole comparison
 * workflow, and a control that vanished when you changed tabs would break it.
 * The two strips do not read as one repeated control: the picker is a row of
 * outlined pills carrying weight glyphs, the tabs are a filled segmented track.
 */
function AttributionTabs() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: attribution } = useAttribution(workspaceId);
  const a = attribution?.data;
  // Linear is the default because it is the only model that takes no position on
  // which touch mattered; the page's argument is that the choice is a choice.
  const [selected, setSelected] = useState<AttributionModel>("linear");

  /** Same idiom as the SEO page: the open tab lives in the URL, `replace` so it does not stack history. */
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "spread";

  const setTab = useCallback(
    (next: string) => {
      const q = new URLSearchParams(params.toString());
      q.set("tab", next);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

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
    <div className="space-y-6">
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
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
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
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          {/* The lens keeps its card; the tab strip sits on the page background directly above the
              panel, which is exactly how the SEO page's tabs are built. Two tab idioms in one app
              would be a worse outcome than the tighter grouping the alternative bought — and inside
              a card the muted track would have stacked a third grey between card and active chip. */}
          <Card className="p-5">
            <ModelPicker selected={selected} onSelect={setSelected} />
          </Card>

          <TabsList>
            <TabsTrigger value="spread">Credit at risk</TabsTrigger>
            <TabsTrigger value="paths">The working</TabsTrigger>
            <TabsTrigger value="models">Every model</TabsTrigger>
          </TabsList>

          <TabsContent value="spread" className="mt-0">
            <CreditSpread
              spread={spread}
              roles={roles}
              selected={selected}
              totalRevenue={totalRevenue}
              pathCount={paths.length}
            />
          </TabsContent>

          <TabsContent value="paths" className="mt-0">
            {paths.length > 0 ? (
              <PathLedger paths={paths} selected={selected} />
            ) : (
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  No paths to show
                </h2>
                <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                  The channel totals above were reported without the underlying conversion paths,
                  so there is no per-path split to divide up.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="models" className="mt-0">
            <ModelMatrix
              spread={spread}
              selected={selected}
              onSelect={setSelected}
              totalRevenue={totalRevenue}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/**
 * `useSearchParams` opts the route into client-side rendering and Next requires the boundary to be
 * explicit. The fallback mirrors the header so the shell does not jump when the tabs resolve.
 */
export default function AttributionPage() {
  return (
    <Suspense fallback={<AttributionSkeleton />}>
      <AttributionTabs />
    </Suspense>
  );
}

function AttributionSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Cross-channel attribution
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The same conversions, divided five ways. Where the models disagree is where a budget
          decision is least safe.
        </p>
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
