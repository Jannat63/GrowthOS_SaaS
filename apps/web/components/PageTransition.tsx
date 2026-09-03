"use client";

import { usePathname } from "next/navigation";

/**
 * The entrance every route gets, applied once, by the shell.
 *
 * Before this, thirteen dashboard pages and two shells each carried `animate-rise` on their own
 * root — the same 500ms lift, pasted per page, with the console and the marketing sub-pages getting
 * nothing at all. Making it a property of the shell means a new page inherits the transition
 * instead of remembering to opt into it, and there is one place to change it.
 *
 * **Keyed on the pathname, deliberately not on the search string.** `template.tsx` is the App
 * Router's built-in hook for this and would remount on any navigation — including one that only
 * changes a query parameter. Several pages here keep tab and filter state in the URL
 * (`/seo`, `/settings`, `/sign-in`), so a template would replay the entrance every time an operator
 * switched tabs. Re-animating a panel that did not change is worse than not animating at all.
 *
 * Reduced motion is handled in CSS, not here: the classes below carry their own
 * `prefers-reduced-motion` rule, so the wrapper stays a plain div for anyone who has asked for
 * less movement — no JS media query, no hydration mismatch.
 */
export function PageTransition({
  children,
  variant = "page",
  exclude,
}: {
  children: React.ReactNode;
  /**
   * `page` for surfaces with a persistent rail, where only the panel changes.
   * `view` for full-screen views, where the whole screen changes.
   */
  variant?: "page" | "view";
  /** Exact pathnames to leave alone — for a page that choreographs its own arrival. */
  exclude?: string[];
}) {
  const pathname = usePathname();

  // No wrapper at all rather than a wrapper with no class: the landing page composes its own
  // page-load sequence, and an extra transformed ancestor would take over the containing block
  // its pinned elements resolve against.
  if (exclude?.includes(pathname)) return <>{children}</>;

  return (
    <div key={pathname} className={variant === "page" ? "page-enter" : "view-enter"}>
      {children}
    </div>
  );
}
