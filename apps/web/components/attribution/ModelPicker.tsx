"use client";
import type { AttributionModel } from "@growthos/logic";
import { cn } from "@/lib/utils/cn";
import { MODELS, shapeOf } from "./models";

/**
 * The shape of a model's split, drawn from its own weights over a four-touch path.
 *
 * A structural device that carries information rather than decorating the button:
 * first-click leans hard left, last-click hard right, linear is flat, time decay
 * ramps, position-based is a U. The rules are readable before the sentence under
 * the rail is. A zero-weight touch keeps a visible stub — "this touch happened and
 * earned nothing" is a different statement from "this touch did not happen", and
 * it is the statement first- and last-click are making.
 */
function WeightGlyph({ model, active }: { model: AttributionModel; active: boolean }) {
  return (
    <span className="flex h-3.5 w-5 items-end gap-[2px]" aria-hidden>
      {shapeOf(model).map((h, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-[1px] transition-colors",
            active ? "bg-primary" : "bg-muted-foreground/50",
          )}
          // Genuinely dynamic: the bar height is the weight.
          style={{ height: `${Math.max(h * 100, 12)}%` }}
        />
      ))}
    </span>
  );
}

/**
 * Picks the model every other panel on the page is expressed in.
 *
 * Buttons with `aria-pressed` inside a labelled group rather than shadcn Tabs:
 * the panels below are not tab panels — all of them stay mounted and re-express
 * the same data — so Radix's `aria-controls` wiring would point at nothing.
 */
export function ModelPicker({
  selected,
  onSelect,
}: {
  selected: AttributionModel;
  onSelect: (model: AttributionModel) => void;
}) {
  const rule = MODELS.find((m) => m.key === selected)?.rule;

  return (
    <div>
      <div
        role="group"
        aria-label="Attribution model"
        className="flex flex-wrap gap-1.5"
      >
        {MODELS.map((m) => {
          const active = selected === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <WeightGlyph model={m.key} active={active} />
              {m.label}
            </button>
          );
        })}
      </div>
      {/*
        One line, always in the same place. The layout does not reflow as the
        selection changes, so the rule is somewhere the eye can return to instead
        of something that appears and displaces the chart below it.
      */}
      <p className="mt-2.5 min-h-[2.5rem] max-w-2xl text-sm text-muted-foreground sm:min-h-0">
        {rule}
      </p>
    </div>
  );
}
