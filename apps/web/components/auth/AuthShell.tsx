import Link from "next/link";
import { ArrowLeftRight, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoMark } from "@/components/brand/LogoMark";

// Kept in step with the landing page's language — six bridges, one queue, one number.
const POINTS = [
  "Connect SEO, Google Ads & Meta — read-only, minutes each",
  "Six bridges turn one channel's signal into another's next move",
  "One blended efficiency number, not three that disagree",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between">
        <span aria-hidden="true" className="ambient-glow -right-24 -top-24 h-80 w-80 bg-primary/30" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-tight">
            GrowthOS
          </span>
        </Link>

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-border bg-ink-2 px-3 py-1 text-xs font-medium text-ink-muted">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            The exchange
          </span>
          <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-tight">
            A win in one channel becomes the next move in another.
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
        <div className="flex items-center justify-between p-6">
          <Link href="/" className="flex items-center gap-2.5 lg:invisible">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight">
              GrowthOS
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm animate-rise">{children}</div>
        </div>
      </main>
    </div>
  );
}
