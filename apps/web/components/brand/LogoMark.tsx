import { cn } from "@/lib/utils/cn";

/**
 * The GrowthOS mark: three stations and the closed circuit between them — the exchange itself.
 *
 * Single source for every surface (marketing header/footer, dashboard rail, auth, onboarding).
 * It used to be hand-rolled markup pasted into six files, which meant the brand could drift in
 * six places independently. Draws its own tile, so callers size it and nothing else.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M16 9 L23 21 L9 21 Z"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="9" r="2.7" fill="var(--primary-foreground)" />
      <circle cx="23" cy="21" r="2.7" fill="var(--primary-foreground)" />
      <circle cx="9" cy="21" r="2.7" fill="var(--primary-foreground)" />
    </svg>
  );
}
