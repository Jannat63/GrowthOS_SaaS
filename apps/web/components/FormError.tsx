import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Why a form was rejected, next to the form.
 *
 * Rejections used to go only to a toast. A toast is the wrong instrument for this: it is dismissed
 * on a timer, so the message is gone by the time someone has finished re-reading their password;
 * it appears at the top of the viewport, nowhere near the fields it is about; and it is announced
 * once and then unreachable, which leaves anyone using a screen reader with a form that silently
 * did nothing. The toast is still fine for a *transient* event — a save succeeded, a job queued —
 * and this is not one of those.
 *
 * `role="alert"` is what makes it announced the moment it appears, and it is placed above the
 * submit button so it sits between the fields and the action rather than after everything.
 *
 * Rose, not ember: `--destructive` is the token for "this failed", and tone.ts reserves the ember
 * for the operator's own actions.
 */
export function FormError({ children, className }: { children?: React.ReactNode; className?: string }) {
  // Rendering an empty shell would reserve space for a message that does not exist and shift the
  // form every time one appears. The caller can pass `null` freely.
  if (!children) return null;

  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5 text-sm leading-relaxed text-destructive",
        className
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
