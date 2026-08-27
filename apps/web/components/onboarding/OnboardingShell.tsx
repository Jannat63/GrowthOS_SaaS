import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/brand/LogoMark";

const STEPS = ["Business", "Connect", "Workspace", "Done"];

export function OnboardingShell({
  step,
  children,
}: {
  step: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div className="loop-backdrop relative min-h-screen bg-muted/20">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <LogoMark />
            <span className="font-display text-lg font-semibold tracking-tight">
              GrowthOS
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Progress */}
        <ol className="flex items-center">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <li
                key={label}
                className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300",
                      done && "border-primary bg-primary text-primary-foreground",
                      active &&
                        "border-primary bg-primary/10 text-primary ring-4 ring-primary/15",
                      !done && !active && "border-border text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : n}
                  </div>
                  <span
                    className={cn(
                      "hidden text-sm font-medium transition-colors sm:inline",
                      active || done ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    className={cn(
                      "mx-3 h-0.5 flex-1 rounded-full transition-colors duration-500",
                      done ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-10 animate-rise">{children}</div>
      </div>
    </div>
  );
}
