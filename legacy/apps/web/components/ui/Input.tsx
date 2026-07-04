import { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
