"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Input } from "@growthos/ui/components/input";
import { cn } from "@/lib/utils/cn";

/**
 * A value you have to ask to change.
 *
 * Every field in this app used to be live the moment the page rendered: one stray click and a
 * keystroke, or a scroll over a focused number input, silently rewrote it. The field is now read-only
 * until Edit is pressed, so changing a value is always something you chose to do rather than
 * something that happened to you.
 *
 * Three details that make the lock worth having rather than merely obstructive:
 *
 * - **Escape reverts.** The value at the moment of unlocking is kept, so backing out restores it.
 *   A lock that can only be committed is just a slower way to make the same mistake.
 * - **Enter and blur commit**, so the keyboard path is unlock, type, Enter, and never touches Done.
 * - **The wheel cannot reach a number input.** A focused `type="number"` changes value on scroll in
 *   every major browser, which is the one accidental edit a lock alone would not have stopped:
 *   you would already be past it, in edit mode, scrolling the page.
 *
 * The locked display deliberately mirrors the `Input` primitive's own box (`h-10`, same radius,
 * border and padding) so unlocking swaps the control without moving anything around it.
 */
export function LockedField({
  id,
  label,
  value,
  onChange,
  type = "text",
  display,
  disabled = false,
  className,
  inputProps,
}: {
  id: string;
  /** Names the field for assistive tech on the Edit button - "Edit target sessions". */
  label: string;
  value: string | number;
  onChange: (next: string) => void;
  type?: "text" | "number" | "url" | "email";
  /** How the value reads while locked - thousands separators, a currency prefix, "Not set". */
  display?: (value: string | number) => React.ReactNode;
  disabled?: boolean;
  className?: string;
  inputProps?: Omit<
    React.ComponentProps<typeof Input>,
    "id" | "value" | "onChange" | "type" | "disabled"
  >;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  // The value as it stood when the lock opened - what Escape puts back.
  const original = useRef<string | number>(value);

  useEffect(() => {
    if (!editing) return;
    original.current = value;
    ref.current?.focus();
    ref.current?.select();
    // `value` is deliberately not a dependency: this captures the value at unlock, and re-running
    // on every keystroke would overwrite the revert target with what was just typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    const shown = display ? display(value) : String(value);
    const empty = shown === "" || shown === null || shown === undefined;
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          id={id}
          className={cn(
            "flex h-10 min-w-0 flex-1 items-center rounded-md border border-input bg-muted/30 px-3 py-2 text-sm",
            empty ? "text-muted-foreground" : "text-foreground",
            disabled && "opacity-50"
          )}
        >
          <span className="truncate tabular-nums">{empty ? "Not set" : shown}</span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          aria-label={`Edit ${label}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        {...inputProps}
        id={id}
        ref={ref}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setEditing(false);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onChange(String(original.current));
            setEditing(false);
          }
        }}
        onBlur={(e) => {
          // Committing on blur must not fire when the click that blurred was Done itself, or the
          // field locks from here and Done's own handler then re-reads a stale state.
          if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.dataset.lockDone === "true") {
            return;
          }
          setEditing(false);
        }}
        // A focused number input treats the wheel as a value control, so scrolling the page over
        // one silently changes it. Blurring on wheel hands the gesture back to the page.
        onWheel={type === "number" ? (e) => e.currentTarget.blur() : undefined}
        className={cn("tabular-nums", inputProps?.className)}
      />
      <button
        type="button"
        data-lock-done="true"
        onClick={() => setEditing(false)}
        aria-label={`Done editing ${label}`}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        Done
      </button>
    </div>
  );
}
