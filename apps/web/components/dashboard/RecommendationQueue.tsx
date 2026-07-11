"use client";
import { ArrowRight } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { cn } from "@/lib/utils/cn";
import type { CrossChannelRecommendation } from "@/lib/logic/cross-channel-engine";
import { CHANNELS, bridgeEndpoints } from "./channels";
import { DataSourceBadge } from "./DataSourceBadge";

const IMPACT_VARIANT = {
  High: "default",
  Medium: "muted",
  Low: "outline",
} as const;

function BridgeTag({ bridge }: { bridge: CrossChannelRecommendation["bridge"] }) {
  const [from, to] = bridgeEndpoints(bridge);
  const From = CHANNELS[from].icon;
  const To = CHANNELS[to].icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <From className="h-3.5 w-3.5 text-primary" />
      {CHANNELS[from].label}
      <ArrowRight className="h-3 w-3" />
      <To className="h-3.5 w-3.5 text-primary" />
      {CHANNELS[to].label}
    </span>
  );
}

export function RecommendationQueue({
  recommendations,
  source,
  onHoverBridge,
}: {
  recommendations: CrossChannelRecommendation[];
  source: "live" | "mock";
  onHoverBridge: (bridge: CrossChannelRecommendation["bridge"] | null) => void;
}) {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            Cross-channel moves
          </h3>
          <Badge variant="muted">{recommendations.length}</Badge>
        </div>
        <DataSourceBadge source={source} />
      </div>

      {recommendations.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">No cross-channel moves right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect a channel to start the loop — recommendations appear as data
            flows in.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col divide-y">
          {recommendations.map((rec) => (
            <li key={rec.id}>
              <button
                type="button"
                onMouseEnter={() => onHoverBridge(rec.bridge)}
                onMouseLeave={() => onHoverBridge(null)}
                onFocus={() => onHoverBridge(rec.bridge)}
                onBlur={() => onHoverBridge(null)}
                className={cn(
                  "-mx-2 flex w-full flex-col gap-1 rounded-lg px-2 py-3 text-left",
                  "transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <BridgeTag bridge={rec.bridge} />
                  <Badge variant={IMPACT_VARIANT[rec.impact]}>{rec.impact}</Badge>
                </div>
                <p className="text-sm font-medium">{rec.title}</p>
                <p className="text-sm text-muted-foreground">{rec.message}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
