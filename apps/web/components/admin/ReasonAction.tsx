"use client";

import { useState } from "react";
import { Button } from "@growthos/ui/components/button";
import { Textarea } from "@growthos/ui/components/textarea";
import { cn } from "@/lib/utils/cn";

/** Matches the server, which rejects anything shorter on every one of these routes. */
export const MIN_REASON = 10;

/**
 * An action against a customer's account that has to be explained.
 *
 * Every write in this console — a plan override, an extended trial, a change to someone's platform
 * access, a forced sign-out — takes a reason of at least ten characters and records it in the audit
 * log. That rule is enforced server-side; this is the shape it takes on screen, in one place, so
 * the four actions do not drift into four different confirmation flows.
 *
 * Two steps, deliberately. The first press commits to the change and shows exactly what is about
 * to happen; the second performs it. The intermediate state is where the sentence naming the
 * account and the change lives, because that is the moment someone catches that they are looking
 * at the wrong customer.
 *
 * The reason field explains its own rule as you type rather than leaving a disabled button with no
 * account of itself — counting characters to discover a minimum is not a thing anyone should have
 * to do.
 */
export function ReasonAction({
  title,
  description,
  children,
  confirmLabel,
  confirmation,
  destructive = false,
  ready = true,
  pending = false,
  onConfirm,
}: {
  title: string;
  description: string;
  /** The controls that decide *what* the action does — plan buttons, a day count, a role. */
  children?: React.ReactNode;
  /** Button text for the first press: what will happen, in the words used afterwards. */
  confirmLabel: string;
  /** The sentence shown between the two presses. Name the account and the change. */
  confirmation: React.ReactNode;
  destructive?: boolean;
  /** False while the controls above are incomplete — no plan chosen, no role picked. */
  ready?: boolean;
  pending?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const short = reason.trim().length < MIN_REASON;
  const blocked = short || !ready || pending;

  function commit() {
    if (blocked) return;
    onConfirm(reason.trim());
    setConfirming(false);
    setReason("");
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {children}

      <div className="space-y-2">
        <label htmlFor={`reason-${title}`} className="block text-xs text-muted-foreground">
          Why
        </label>
        <Textarea
          id={`reason-${title}`}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setConfirming(false);
          }}
          placeholder="In enough detail to make sense to whoever reads the log in six months."
          rows={2}
        />
        {short && (
          <p className="text-xs text-muted-foreground">
            {reason.trim().length === 0
              ? "A reason is required — it goes in the audit log."
              : `${MIN_REASON - reason.trim().length} more characters needed.`}
          </p>
        )}
      </div>

      {!confirming ? (
        <Button
          type="button"
          size="sm"
          variant={destructive ? "destructive" : "default"}
          disabled={blocked}
          onClick={() => setConfirming(true)}
        >
          {confirmLabel}
        </Button>
      ) : (
        <div
          className={cn(
            "rounded-lg border p-3",
            destructive ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5"
          )}
        >
          <p className="text-sm leading-relaxed">{confirmation}</p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={destructive ? "destructive" : "default"}
              disabled={blocked}
              onClick={commit}
            >
              {pending ? "Working…" : "Yes, do it"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
