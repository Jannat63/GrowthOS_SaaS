import Link from "next/link";
import { Check } from "lucide-react";

const STEPS = ["Business", "Connect", "Workspace", "Done"];

export function OnboardingShell({
  step,
  children,
}: {
  step: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              GrowthOS
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Stepper */}
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {done ? <Check className="h-4 w-4" /> : n}
                </div>
                <span
                  className={[
                    "hidden text-sm font-medium sm:inline",
                    active ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {label}
                </span>
                {n < STEPS.length && (
                  <span
                    className={[
                      "ml-2 hidden h-px flex-1 sm:block",
                      done ? "bg-primary" : "bg-border",
                    ].join(" ")}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
