"use client";

import { useState } from "react";
import { Button } from "@growthos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@growthos/ui/components/dialog";
import { ReasonAction, type StepUpInput } from "@/components/admin/ReasonAction";
import { cn } from "@/lib/utils/cn";

/**
 * A write against a customer's account, behind a door.
 *
 * These controls used to sit open on the page — the role selector, the reason box and a live
 * "Change access" button were all just *there*, below the fold of an account you might have opened
 * only to read. Nothing was one click from firing, but the whole apparatus being permanently
 * present is its own hazard: it invites a stray click, it puts the most dangerous control in the
 * product on the same visual footing as a table, and someone glancing at a shared screen sees the
 * machinery rather than the account.
 *
 * A button that names the action, and a dialog that holds the machinery, means the page is safe to
 * read and the action is deliberate. The two-step confirmation inside `ReasonAction` still applies
 * on top: opening the dialog is not consent, and neither is the first press.
 *
 * `destructive` colours both the trigger and the confirmation. It marks what is hard to walk back —
 * a plan override that puts Stripe and the app out of step, a change to who can read every account
 * on the platform — not merely what writes to a table.
 */
export function ActionDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel,
  confirmation,
  destructive = false,
  ready = true,
  pending = false,
  onConfirm,
  onOpenChange,
}: {
  /** Button text. Say what will happen, in the words used inside. */
  trigger: string;
  title: string;
  description: string;
  /** Controls that decide what the action does — plan buttons, a day count, a role. */
  children?: React.ReactNode;
  confirmLabel: string;
  confirmation: React.ReactNode;
  destructive?: boolean;
  ready?: boolean;
  pending?: boolean;
  onConfirm: (input: StepUpInput) => void;
  /** Called when the dialog opens or closes, so a caller can reset its own selection. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  function change(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={destructive ? "outline" : "outline"}
        onClick={() => change(true)}
        className={cn(
          destructive &&
            "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        )}
      >
        {trigger}
      </Button>

      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <ReasonAction
            // The title and description are the dialog's own; the body only carries the controls.
            confirmLabel={confirmLabel}
            confirmation={confirmation}
            destructive={destructive}
            ready={ready}
            pending={pending}
            onConfirm={(input) => {
              onConfirm(input);
              change(false);
            }}
          >
            {children}
          </ReasonAction>
        </DialogContent>
      </Dialog>
    </>
  );
}
