import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        muted: "border-transparent bg-muted text-muted-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * A `span`, not a `div` — a badge is inline content and is routinely written inside a sentence
 * (`<p><Badge>cadence</Badge> Currently refreshing hourly.</p>`). `<p>` accepts only phrasing
 * content, so a `div` there makes the HTML parser close the paragraph early: the server markup and
 * the client tree then disagree and React throws a hydration error. `inline-flex` already made this
 * render inline-level, so the element name is the only thing that changes.
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
