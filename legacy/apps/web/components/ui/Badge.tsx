import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-slate-100 text-neutral",
};

export function Badge({ className, tone = "neutral", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
