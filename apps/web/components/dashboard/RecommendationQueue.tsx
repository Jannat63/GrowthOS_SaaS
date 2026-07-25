"use client";
import { ArrowRight } from "lucide-react";
import type { Recommendation } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { cn } from "@/lib/utils/cn";
import { CHANNELS, channelToKey, type ChannelKey } from "./channels";
import { DataSourceBadge } from "./DataSourceBadge";

const IMPACT_VARIANT = {
  High: "default",
  Medium: "muted",
  Low: "outline",
} as const;

function impactLabel(score: number): keyof typeof IMPACT_VARIANT {
  return score >= 80 ? "High" : score >= 50 ? "Medium" : "Low";
}

function BridgeTag({ from, to }: { from: ChannelKey; to: ChannelKey }) {
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
  onHoverChannels,
}: {
  recommendations: Recommendation[];
  source: "live" | "mock";
  onHoverChannels: (channels: ChannelKey[] | null) => void;
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
          {recommendations.map((rec) => {
            const from = channelToKey(rec.sourceChannel);
            const to = channelToKey(rec.targetChannel);
            const touched = [from, to].filter((k): k is ChannelKey => k !== null);
            const impact = impactLabel(rec.impactScore);
            return (
              <li key={rec.id}>
                <button
                  type="button"
                  onMouseEnter={() => onHoverChannels(touched.length ? touched : null)}
                  onMouseLeave={() => onHoverChannels(null)}
                  onFocus={() => onHoverChannels(touched.length ? touched : null)}
                  onBlur={() => onHoverChannels(null)}
                  className={cn(
                    "-mx-2 flex w-full flex-col gap-1 rounded-lg px-2 py-3 text-left",
                    "transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    {from && to ? (
                      <BridgeTag from={from} to={to} />
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        Cross-channel
                      </span>
                    )}
                    <Badge variant={IMPACT_VARIANT[impact]}>{impact}</Badge>
                  </div>
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-sm text-muted-foreground">{rec.body}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
