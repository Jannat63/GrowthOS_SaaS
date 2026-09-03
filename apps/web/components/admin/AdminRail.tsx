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
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@growthos/ui/components/tooltip";
import { cn } from "@/lib/utils/cn";

/**
 * The console's section navigation, collapsible.
 *
 * It has been both extremes and neither worked alone. Icon-only meant hovering each glyph to find
 * out where you were; a permanent 208px column spends an eighth of the window on four links an
 * operator memorises in a day. So it is a choice, remembered per browser — wide while you are
 * learning the place, narrow when you are working a table that wants the width.
 *
 * Collapsed, the labels move into tooltips rather than disappearing, and every item keeps its
 * accessible name — the icon alone is never the only thing naming a destination.
 */

const SECTIONS = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, superAdminOnly: true },
];

const STORAGE_KEY = "growthos.admin.sidebar";

/**
 * Remembered in localStorage, read after mount.
 *
 * Reading during render would use the server's answer — there is no localStorage there — and the
 * first paint would disagree with the second, which React reports as a hydration error. Expanded is
 * the first-run default: someone who has never chosen should see the labels.
 */
function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "collapsed");
    } catch {
      // Private windows and blocked site data both throw on access. The default stands.
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // Not being able to remember the choice is no reason to refuse to make it.
      }
      return next;
    });
  }

  return { collapsed, toggle };
}

export function AdminRail({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarState();
  const sections = SECTIONS.filter((s) => !s.superAdminOnly || isSuperAdmin);

  return (
    <TooltipProvider delayDuration={200}>
      <nav
        aria-label="Console sections"
        className={cn(
          // A horizontal strip on a phone, where there is no room for a column and no hover to
          // recover a hidden label from.
          "flex shrink-0 gap-1 overflow-x-auto border-b p-2",
          "md:flex-col md:gap-0.5 md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:p-2",
          collapsed ? "md:w-14" : "md:w-52"
        )}
      >
        {sections.map(({ href, label, icon: Icon }) => {
          // Exact match only: /admin must not light up while you are on /admin/users.
          const active = pathname === href;
          const link = (
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                collapsed && "md:h-9 md:w-9 md:justify-center md:px-0 md:py-0",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {/* Hidden visually when collapsed, never removed: the name still reaches a reader. */}
              <span className={cn(collapsed && "md:sr-only")}>{label}</span>
            </Link>
          );

          if (!collapsed) return <div key={href}>{link}</div>;
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" className="hidden md:block">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/*
          The toggle sits at the foot of the column, away from the destinations — it changes the
          furniture, it does not take you anywhere, and mixing the two invites a mis-click on the
          way to a page. Hidden below md, where the nav is a horizontal strip and has nothing to
          collapse.
        */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
          aria-pressed={collapsed}
          className={cn(
            "mt-auto hidden shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors",
            "hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "md:flex",
            collapsed && "md:h-9 md:w-9 md:justify-center md:px-0 md:py-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className={cn(collapsed && "md:sr-only")}>Collapse</span>
        </button>
      </nav>
    </TooltipProvider>
  );
}
