"use client";

import { useId, useState } from "react";
import { Button } from "@growthos/ui/components/button";
import { Textarea } from "@growthos/ui/components/textarea";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { cn } from "@/lib/utils/cn";

/** Matches the server, which rejects anything shorter on every one of these routes. */
export const MIN_REASON = 10;

export interface StepUpInput {
  reason: string;
  password: string;
}

/**
 * An action against a customer's account: explained, then re-authenticated.
 *
 * Every write in this console — a plan override, an extended trial, a change to someone's platform
 * access, a forced sign-out — takes a reason of at least ten characters and the operator's own
 * password. Both rules are enforced server-side; this is the shape they take on screen, in one
 * place, so the four actions cannot drift into four different flows.
 *
 * Two steps, and the password belongs to the second one. The first press commits to the change and
 * shows exactly what is about to happen; only then does it ask you to prove you are still you.
 * Asking for a password before someone has decided anything trains people to type it reflexively,
 * which is the opposite of what a step-up check is for — and the intermediate panel, naming the
 * account and the change, is the moment someone catches that they have the wrong customer open.
 *
 * The password is never held anywhere but this component's state, and it is cleared the instant the
 * action fires or the operator backs out.
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
  /** Omitted when the surrounding dialog already states them (see ActionDialog). */
  title?: string;
  description?: string;
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
  onConfirm: (input: StepUpInput) => void;
}) {
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  // Two of these can be on one page; a title-derived id would tie the label to the wrong box.
  const reasonId = useId();
  const passwordId = useId();

  const short = reason.trim().length < MIN_REASON;
  const blockedFirst = short || !ready || pending;
  const blockedFinal = blockedFirst || password.length === 0;

  function back() {
    setConfirming(false);
    setPassword("");
  }

  function commit() {
    if (blockedFinal) return;
    onConfirm({ reason: reason.trim(), password });
    setConfirming(false);
    setReason("");
    setPassword("");
  }

  return (
    <div className="space-y-3">
      {(title || description) && (
        <div>
          {title && <p className="text-sm font-medium">{title}</p>}
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {children}

      <div className="space-y-2">
        <label htmlFor={reasonId} className="block text-xs text-muted-foreground">
          Why
        </label>
        <Textarea
          id={reasonId}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            back();
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
          disabled={blockedFirst}
          onClick={() => setConfirming(true)}
        >
          {confirmLabel}
        </Button>
      ) : (
        <div
          className={cn(
            "space-y-3 rounded-lg border p-3",
            destructive ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5"
          )}
        >
          <p className="text-sm leading-relaxed">{confirmation}</p>

          <div className="space-y-1.5">
            <label htmlFor={passwordId} className="block text-xs text-muted-foreground">
              Your password
            </label>
            <PasswordInput
              id={passwordId}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Confirm it is you"
              // The operator has already decided by this point; put the cursor where it is needed.
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Your own password, not the customer&rsquo;s. A signed-in session says who opened the
              browser, not who is at it now.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={destructive ? "destructive" : "default"}
              disabled={blockedFinal}
              onClick={commit}
            >
              {pending ? "Working…" : "Yes, do it"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={back}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
