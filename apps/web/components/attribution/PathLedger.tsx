"use client";
import { useMemo } from "react";
import {
  channelLabel,
  modelWeights,
  type AttributionModel,
  type ConversionPath,
} from "@growthos/logic";
import { Card } from "@growthos/ui/components/card";
import { cn } from "@/lib/utils/cn";
import { MODEL_LABELS, MODELS, prose, usd, weightPct } from "./models";

/** Enough to make the argument without turning the page into a data dump. */
const MAX_PATHS = 12;

/**
 * The paths themselves, with the selected model's split printed on each touch.
 *
 * The page used to end on the line "Sample multi-touch paths — real paths
 * populate as connected channels report conversions", which named the one thing
 * it never showed. Without the paths every figure above is unfalsifiable: a
 * reader is asked to accept that SEO earns nothing under last click and $630
 * under first click, with no way to see that it opens three paths and closes
 * none. The API already reconstructed these paths and discarded them; it now
 * returns them.
 *
 * The tint is the weight. Under last click one chip is solid and the rest are
 * hollow, which states the rule more plainly than the sentence describing it —
 * and it is the only honest way to show that position-based falls back to an even
 * 50/50 on a two-touch path rather than the 40/40 its name implies. Six of the
 * ten seeded paths are two touches long.
 */
export function PathLedger({
  paths,
  selected,
}: {
  paths: ConversionPath[];
  selected: AttributionModel;
}) {
  // Largest first, and touches in touch order: neither the API (which orders by a
  // string id, so p10 sorts between p1 and p2) nor the fixture guarantees either.
  const ordered = useMemo(
    () =>
      [...paths]
        .map((p) => ({ ...p, touchpoints: [...p.touchpoints].sort((a, b) => a.order - b.order) }))
        .sort((a, b) => b.conversionValue - a.conversionValue),
    [paths],
  );

  const shown = ordered.slice(0, MAX_PATHS);
  const rule = MODELS.find((m) => m.key === selected)?.rule;

  // Only legend what is actually on screen. Linear and time decay credit every
  // touch something, so under those models the dash note explained a mark that
  // appears nowhere on the page.
  const hasUncredited = useMemo(
    () =>
      shown.some((p) =>
        modelWeights(selected, p.touchpoints.length).some((w) => w === 0),
      ),
    [shown, selected],
  );

  return (
    <Card className="p-6">
      <header className="max-w-3xl">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          How {prose(MODEL_LABELS[selected])} divides each of the {ordered.length} paths
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{rule}</p>
      </header>

      <ol className="mt-5 grid gap-2.5 lg:grid-cols-2">
        {shown.map((path) => {
          const weights = modelWeights(selected, path.touchpoints.length);
          return (
            <li key={path.id} className="rounded-lg border bg-secondary/30 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {usd(path.conversionValue)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {path.touchpoints.length} touch{path.touchpoints.length === 1 ? "" : "es"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-stretch gap-1">
                {path.touchpoints.map((touch, i) => {
                  const weight = weights[i] ?? 0;
                  const credited = weight > 0;
                  return (
                    <div key={i} className="flex min-w-0 flex-1 items-stretch gap-1">
                      {i > 0 && (
                        <span
                          className="self-center text-xs text-muted-foreground/60"
                          aria-hidden
                        >
                          ›
                        </span>
                      )}
                      <div
                        className={cn(
                          "min-w-[5rem] flex-1 rounded-md border px-2 py-1.5 text-center",
                          "transition-colors duration-300 motion-reduce:transition-none",
                          credited
                            ? "border-transparent"
                            : "border-dashed border-border text-muted-foreground",
                        )}
                        // Genuinely dynamic: the fill *is* the weight. Capped well
                        // below full strength so `--foreground` stays legible on it
                        // in both themes, and so a white-labelled primary cannot
                        // turn a chip into an unreadable block.
                        style={
                          credited
                            ? {
                                background: `color-mix(in oklab, var(--color-primary) ${Math.round(weight * 42)}%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        {/* Wraps rather than truncates: a chip reading "Organi…"
                            names nothing, and `items-stretch` keeps every chip in
                            the path the same height when one of them takes two
                            lines. */}
                        <p className="text-xs font-medium leading-tight">
                          {channelLabel(touch.channel)}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums">{weightPct(weight)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {(ordered.length > MAX_PATHS || hasUncredited) && (
        <p className="mt-4 text-xs text-muted-foreground">
          {ordered.length > MAX_PATHS
            ? `The ${MAX_PATHS} largest of ${ordered.length} conversion paths. `
            : ""}
          {hasUncredited ? "A dash means the touch happened and this model credits it nothing." : ""}
        </p>
      )}
    </Card>
  );
}
