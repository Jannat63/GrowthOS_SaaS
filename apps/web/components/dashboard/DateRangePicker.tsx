"use client";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import {
  Calendar,
  type DateRange as DayPickerRange,
} from "@growthos/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@growthos/ui/components/popover";
import {
  DEFAULT_PRESET_DAYS,
  RANGE_PRESETS,
  formatDay,
  presetRange,
  rangeLength,
  useRangeStore,
  type DateRange,
} from "@/lib/stores/range";
import { cn } from "@/lib/utils/cn";

/**
 * The reporting window control: quick presets plus a calendar for anything else.
 *
 * Presets are anchored to `dataThrough` — the newest day the workspace actually has data for — not
 * to today. That is the whole reason this component takes bounds as props instead of reading the
 * clock: seeded workspaces run to a fixed date in the past, so "last 30 days" measured from today
 * would select a window with no rows in it and render an empty dashboard. The calendar disables
 * everything outside `[dataFrom, dataThrough]` for the same reason, so a range that is silently
 * half-empty cannot be chosen at all.
 */
export function DateRangePicker({
  dataFrom,
  dataThrough,
  /** The window the API actually used, so the label reflects the data rather than local intent. */
  activeRange,
  className,
}: {
  dataFrom: string | null | undefined;
  dataThrough: string | null | undefined;
  activeRange: DateRange | null | undefined;
  className?: string;
}) {
  const range = useRangeStore((s) => s.range);
  const setRange = useRangeStore((s) => s.setRange);
  const [open, setOpen] = useState(false);
  // Selection in progress. Held locally so a half-picked range (a `from` with no `to` yet) never
  // reaches the store and fires a request for a one-day window.
  const [draft, setDraft] = useState<DayPickerRange | undefined>(undefined);

  const shown = range ?? activeRange ?? null;

  useEffect(() => {
    if (!open) return;
    setDraft(
      shown
        ? { from: new Date(`${shown.from}T00:00:00Z`), to: new Date(`${shown.to}T00:00:00Z`) }
        : undefined
    );
  }, [open, shown?.from, shown?.to]);

  const min = dataFrom ? new Date(`${dataFrom}T00:00:00Z`) : undefined;
  const max = dataThrough ? new Date(`${dataThrough}T00:00:00Z`) : undefined;

  function applyPreset(days: number) {
    // Without bounds yet, clear to null and let the server resolve the default.
    setRange(dataThrough ? presetRange(dataThrough, days) : null);
    setOpen(false);
  }

  function applyDraft() {
    if (!draft?.from || !draft?.to) return;
    setRange({
      from: draft.from.toISOString().slice(0, 10),
      to: draft.to.toISOString().slice(0, 10),
    });
    setOpen(false);
  }

  // Open on the month the selection ends in — with a two-month view that puts the active range in
  // sight rather than making the reader page back to find it.
  const draftMonth = (() => {
    const end = draft?.to ?? draft?.from ?? max;
    if (!end) return undefined;
    const m = new Date(end);
    m.setUTCDate(1);
    m.setUTCMonth(m.getUTCMonth() - 1);
    return min && m < min ? min : m;
  })();

  const draftDays =
    draft?.from && draft?.to
      ? rangeLength({
          from: draft.from.toISOString().slice(0, 10),
          to: draft.to.toISOString().slice(0, 10),
        })
      : 0;

  const activeDays = shown ? rangeLength(shown) : DEFAULT_PRESET_DAYS;
  const matchedPreset = RANGE_PRESETS.find(
    (p) => p.days === activeDays && (!dataThrough || shown?.to === dataThrough)
  );

  const label = shown
    ? matchedPreset
      ? matchedPreset.description
      : `${formatDay(shown.from)} – ${formatDay(shown.to, true)}`
    : `Last ${DEFAULT_PRESET_DAYS} days`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2 font-normal", className)}
          aria-label={`Reporting period: ${label}`}
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Presets read as a menu, not a toolbar: they are alternatives to each other, and the
              calendar beside them is the escape hatch when none of them is the right window. */}
          <div className="shrink-0 border-b p-2 sm:w-40 sm:border-b-0 sm:border-r">
            <p className="px-2 pb-1.5 pt-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
              Quick ranges
            </p>
            <div className="flex flex-wrap gap-1 sm:flex-col">
              {RANGE_PRESETS.map((preset) => (
                <PresetButton
                  key={preset.days}
                  label={preset.description}
                  active={matchedPreset?.days === preset.days}
                  onClick={() => applyPreset(preset.days)}
                />
              ))}
              {dataFrom && dataThrough && (
                <PresetButton
                  label="All data"
                  active={shown?.from === dataFrom && shown?.to === dataThrough}
                  onClick={() => {
                    setRange({ from: dataFrom, to: dataThrough });
                    setOpen(false);
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col p-3">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draftMonth}
              startMonth={min}
              endMonth={max}
              disabled={
                min && max ? [{ before: min }, { after: max }] : max ? { after: max } : undefined
              }
              excludeDisabled
            />

            <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                {draft?.from && draft?.to ? (
                  <>
                    <span className="text-foreground">
                      {formatDay(draft.from.toISOString().slice(0, 10))} –{" "}
                      {formatDay(draft.to.toISOString().slice(0, 10), true)}
                    </span>{" "}
                    · {draftDays} days
                  </>
                ) : draft?.from ? (
                  "Pick an end date"
                ) : dataThrough ? (
                  `Data runs through ${formatDay(dataThrough, true)}`
                ) : (
                  "No data yet"
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={applyDraft} disabled={!draft?.from || !draft?.to}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
      )}
    >
      {label}
    </button>
  );
}
