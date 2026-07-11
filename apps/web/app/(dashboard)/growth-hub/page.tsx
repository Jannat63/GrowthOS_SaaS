"use client";
import { useState } from "react";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { LoopMasthead } from "@/components/dashboard/LoopMasthead";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RecommendationQueue } from "@/components/dashboard/RecommendationQueue";
import {
  platformToChannel,
  type ChannelKey,
} from "@/components/dashboard/channels";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useConnections } from "@/lib/hooks/useConnections";
import { useGrowthHub } from "@/lib/hooks/useGrowthHub";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import type { CrossChannelRecommendation } from "@/lib/logic/cross-channel-engine";

const TABS = [
  { label: "Overview", href: "#overview" },
  { label: "Recommendations", href: "#recommendations" },
];

export default function GrowthHubPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId =
    activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  const { data: conn } = useConnections(workspaceId);
  const { data: hub } = useGrowthHub(workspaceId);
  const { data: recs } = useRecommendations(workspaceId);

  const [activeBridge, setActiveBridge] =
    useState<CrossChannelRecommendation["bridge"] | null>(null);

  const connectedKeys = (conn?.data ?? [])
    .filter((c) => c.isActive)
    .map((c) => platformToChannel(c.platform))
    .filter((k): k is ChannelKey => k !== null);

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Growth Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Your cross-channel command center.
        </p>
      </div>

      <ModuleTabs tabs={TABS} activeHref="#overview" />

      <section id="overview" className="scroll-mt-20">
        {hub ? (
          <LoopMasthead
            mer={hub.data.mer}
            channelMetric={hub.data.channelMetric}
            connectedKeys={connectedKeys}
            activeBridge={activeBridge}
            source={hub.source}
          />
        ) : (
          <Skeleton className="h-80 w-full rounded-lg" />
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hub
          ? hub.data.kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)
          : Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
      </div>

      <section id="recommendations" className="scroll-mt-20">
        {recs ? (
          <RecommendationQueue
            recommendations={recs.data}
            source={recs.source}
            onHoverBridge={setActiveBridge}
          />
        ) : (
          <Skeleton className="h-64 w-full rounded-lg" />
        )}
      </section>
    </div>
  );
}
