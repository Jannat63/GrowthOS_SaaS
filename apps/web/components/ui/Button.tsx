import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "tertiary" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-[#4338CA] active:bg-[#3730A3]",
  secondary:
    "bg-white text-primary border border-primary/30 hover:bg-primary/5 active:bg-primary/10",
  tertiary:
    "bg-transparent text-primary hover:bg-primary/5 active:bg-primary/10",
  danger:
    "bg-danger text-white hover:bg-[#DC2626] active:bg-[#B91C1C]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
