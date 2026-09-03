"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { cn } from "@/lib/utils/cn";
import { useSidebarStore } from "@/lib/stores/sidebar";

/**
 * The console's rail — the same system as the customer dashboard's, deliberately.
 *
 * It shares `useSidebarStore`, so collapsing here collapses there: "I like my sidebar narrow" is a
 * preference about the person, not about the page. It shares the widths (w-16 / w-60), the width
 * transition, the hydration guard, the ink palette, the active-item bar, and the collapsed brand
 * mark that swaps to the expand icon on hover. Anyone who has used the product already knows how
 * this works, and an operator moving between the two surfaces should not have to learn a second
 * set of rules for the same furniture.
 *
 * **The rail keeps the ink palette in both themes**, exactly as the customer app's does. That is
 * also what gives the console back an identity now that the rest of it follows the light/dark
 * toggle: the dark rail and the gold hairline say where you are without the whole surface having to
 * be dark.
 *
 * What is deliberately different is the mark: a shield and "Super Admin", not the workspace's logo
 * and name. This rail must never be mistakable for a customer's own — and unlike the dashboard, it
 * is never white-labelled.
 */

// Ghost icon button restyled for the dark ink rail (tailwind-merge overrides the default light
// accent hover). Same constant as the dashboard sidebar, for the same reason.
const INK_ICON_BTN =
  "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground focus-visible:ring-primary/60 focus-visible:ring-offset-0";

type Item = { href: string; label: string; icon: typeof LayoutGrid; superAdminOnly?: boolean };

const SECTIONS: Item[] = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, superAdminOnly: true },
];

export function AdminRail({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const storedCollapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  // Guard against hydration mismatch: default to expanded until the persisted value has
  // rehydrated on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const collapsed = mounted && storedCollapsed;

  const sections = SECTIONS.filter((s) => !s.superAdminOnly || isSuperAdmin);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col overflow-hidden border-r border-ink-border bg-ink text-ink-foreground transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          collapsed ? "justify-center px-0" : "justify-between px-5"
        )}
      >
        {collapsed ? (
          // Collapsed: the shield by default, swapping to the expand icon on hover — the same
          // gesture the dashboard uses for its logo.
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Expand sidebar"
            className={cn("group relative h-9 w-9 rounded-lg", INK_ICON_BTN)}
          >
            <ShieldAlert
              className="h-4 w-4 text-warning transition-opacity duration-200 group-hover:opacity-0"
              aria-hidden="true"
            />
            <PanelLeftOpen
              className="absolute h-4 w-4 text-ink-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              aria-hidden="true"
            />
          </Button>
        ) : (
          <>
            <Link
              href="/admin"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span className="truncate font-display text-lg font-semibold tracking-tight">
                Super Admin
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Collapse sidebar"
              className={cn("h-8 w-8 rounded-lg", INK_ICON_BTN)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <nav aria-label="Console sections" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {sections.map(({ href, label, icon: Icon }) => {
          // Exact match only: /admin must not light up while you are on /admin/users.
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              // Native title rather than a tooltip component: the dashboard rail does the same, and
              // the label is still in the DOM for a screen reader either way.
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                active
                  ? "bg-ink-2 text-ink-foreground"
                  : "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground"
              )}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-ink-muted group-hover:text-ink-foreground"
                )}
                aria-hidden="true"
              />
              {/* Kept in the accessibility tree when collapsed so the icon is never the only name. */}
              <span className={collapsed ? "sr-only" : undefined}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* The dashboard rail keeps Settings in a footer; this one keeps the console's own security
          page, which is the equivalent destination — the operator's own account rather than a
          customer's. */}
      <div className="shrink-0 border-t border-ink-border px-3 py-4">
        <Link
          href="/admin/security"
          title={collapsed ? "Two-factor" : undefined}
          className={cn(
            "group flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
            pathname === "/admin/security"
              ? "bg-ink-2 text-ink-foreground"
              : "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground"
          )}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={collapsed ? "sr-only" : undefined}>Two-factor</span>
        </Link>
      </div>
    </aside>
  );
}

/**
 * The same sections as a horizontal strip, for screens too narrow for a rail.
 *
 * The `aside` above is `hidden md:flex`, matching the dashboard, so without this there would be no
 * navigation at all on a phone.
 */
export function AdminNavStrip({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const sections = SECTIONS.filter((s) => !s.superAdminOnly || isSuperAdmin);

  return (
    <nav
      aria-label="Console sections"
      className="flex gap-1 overflow-x-auto border-b p-2 md:hidden"
    >
      {sections.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
