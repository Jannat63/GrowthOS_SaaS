import Link from "next/link";
import { Repeat, Check } from "lucide-react";

const POINTS = [
  "Connect SEO, Google Ads & Meta in minutes",
  "Cross-channel plays ranked by impact",
  "One blended efficiency number, not five dashboards",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="h-3 w-3 rounded-sm bg-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            GrowthOS
          </span>
        </Link>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-border bg-ink-2 px-3 py-1 text-xs font-medium text-ink-muted">
            <Repeat className="h-3.5 w-3.5" />
            The insight loop
          </span>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight">
            Your channels, finally talking to each other.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-ink-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-muted">
          © {new Date().getFullYear()} GrowthOS
        </p>
      </aside>

      {/* Form side */}
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="h-3 w-3 rounded-sm bg-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              GrowthOS
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
