"use client";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@growthos/ui/components/input";
import { cn } from "@/lib/utils/cn";

/**
 * A password field that can be revealed.
 *
 * Typing a password blind is where sign-in failures come from that look like wrong credentials and
 * are actually a typo or a stuck caps lock — and this app's own passwords are case-sensitive, so
 * `ADMIN1234` and `Admin1234` are two different accounts' worth of confusion.
 *
 * The toggle is a real button, not an icon with a click handler: it is reachable by keyboard,
 * announces which state it will move to, and carries `type="button"` so it never submits the form
 * it sits inside. It is excluded from the tab order between the field and the submit button —
 * `tabIndex={-1}` — because tabbing from a password to a reveal button instead of to "Sign in" is
 * the wrong default for the common case; it stays clickable, and screen-reader users still reach it
 * through the form's control list.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentPropsWithoutRef<typeof Input>, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        ref={ref}
        // `text` while revealed. Autofill still works because autoComplete is passed through
        // unchanged by the caller.
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className={cn(
          "absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md",
          "text-muted-foreground transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
});
