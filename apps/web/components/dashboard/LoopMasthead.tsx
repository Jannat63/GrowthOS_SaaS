"use client";
import { Card } from "@growthos/ui/components/card";
import { cn } from "@/lib/utils/cn";
import type { MERResult } from "@growthos/logic";
import { CHANNELS, CHANNEL_ORDER, type ChannelKey } from "./channels";
import { DataSourceBadge } from "./DataSourceBadge";

/** Node coordinates on the 320×320 orbit — SEO up top, the two paid channels below. */
const POS: Record<ChannelKey, { x: number; y: number; chip: string }> = {
  seo: { x: 160, y: 44, chip: "left-1/2 top-[13%]" },
  google: { x: 262, y: 232, chip: "left-[82%] top-[72%]" },
  meta: { x: 58, y: 232, chip: "left-[18%] top-[72%]" },
};

export function LoopMasthead({
  mer,
  channelMetric,
  connectedKeys,
  activeChannels,
  source,
}: {
  mer: MERResult;
  channelMetric: Record<ChannelKey, string>;
  connectedKeys: ChannelKey[];
  activeChannels: ChannelKey[] | null;
  source: "live" | "mock";
}) {
  const active = activeChannels ? new Set(activeChannels) : null;
  const isLit = (key: ChannelKey) => !active || active.has(key);

  return (
    <Card className="grid gap-6 overflow-hidden p-6 md:grid-cols-[minmax(0,22rem)_1fr] md:p-8">
      {/* The orbit — channels feeding the Blended MER hub */}
      <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
        <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 blur-3xl" />

        <svg
          viewBox="0 0 320 320"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <circle cx="160" cy="160" r="120" fill="none" stroke="var(--color-primary)" strokeOpacity="0.14" strokeWidth="1" />
          <circle
            cx="160"
            cy="160"
            r="120"
            fill="none"
            stroke="var(--color-primary)"
            strokeOpacity="0.5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 12"
            className="loop-flow"
          />
          {CHANNEL_ORDER.map((key) => {
            const { x, y } = POS[key];
            const lit = isLit(key);
            return (
              <line
                key={key}
                x1="160"
                y1="160"
                x2={x}
                y2={y}
                stroke="var(--color-primary)"
                strokeOpacity={active ? (lit ? 0.9 : 0.07) : 0.18}
                strokeWidth={active && lit ? 2.5 : 1.5}
                strokeDasharray={active && lit ? "3 7" : undefined}
                className={cn(active && lit && "loop-flow")}
              />
            );
          })}
          {CHANNEL_ORDER.map((key) => {
            const { x, y } = POS[key];
            const tone =
              CHANNELS[key].tone === "success"
                ? "var(--color-success)"
                : "var(--color-primary)";
            return (
              <circle
                key={key}
                cx={x}
                cy={y}
                r={active && isLit(key) ? 5.5 : 4}
                fill={tone}
                opacity={isLit(key) ? 1 : 0.3}
              />
            );
          })}
        </svg>

        {/* Central hub — Blended MER */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center rounded-2xl border bg-card px-5 py-4 text-center shadow-lg">
            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              Blended MER
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">
              {mer.blendedMER.toFixed(2)}×
            </span>
          </div>
        </div>

        {/* Channel node chips */}
        {CHANNEL_ORDER.map((key) => {
          const { icon: Icon, label, tone } = CHANNELS[key];
          const connected = connectedKeys.includes(key);
          return (
            <div
              key={key}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 transition-opacity",
                POS[key].chip,
                isLit(key) ? "opacity-100" : "opacity-40"
              )}
            >
              <div className="w-36 rounded-xl border bg-card px-3 py-2 shadow-md">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-lg",
                      tone === "success"
                        ? "bg-success/10 text-success"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {channelMetric[key]}
                </p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      connected ? "bg-success" : "bg-muted-foreground/40"
                    )}
                  />
                  <span className="text-[0.65rem] text-muted-foreground">
                    {connected ? "Connected" : "Not connected"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Narrative column */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Your insight loop
          </span>
          <DataSourceBadge source={source} />
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          One loop across SEO, Google&nbsp;Ads &amp; Meta
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {mer.interpretation} Every channel feeds a shared efficiency number —
          hover a recommendation to trace which channels it moves between.
        </p>
      </div>
    </Card>
  );
}
