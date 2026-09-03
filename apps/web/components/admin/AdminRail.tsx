"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutGrid, ScrollText, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * The console's section navigation.
 *
 * It was briefly an icon-only rail. That was wrong: four glyphs with no words made an operator
 * hover each one to find out where they were, and the labels were the thing being economised on —
 * not the pixels. Labels are back, at 208px, and the palette (Cmd-K) still handles the far more
 * common job of jumping to a specific account.
 *
 * It does not scroll away. The shell gives the sidebar and header their own height and lets only
 * the content column scroll, so navigation is in the same place on a two-row table and a two-
 * hundred-row one.
 */

const SECTIONS = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, superAdminOnly: true },
];

export function AdminRail({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  const sections = SECTIONS.filter((s) => !s.superAdminOnly || isSuperAdmin);

  return (
    <nav
      aria-label="Console sections"
      className={cn(
        // Horizontal strip on a phone, a column that owns its own scroll on a desktop.
        "flex shrink-0 gap-1 overflow-x-auto border-b p-2",
        "md:w-52 md:flex-col md:gap-0.5 md:overflow-y-auto md:overflow-x-visible",
        "md:border-b-0 md:border-r md:p-3"
      )}
    >
      {sections.map(({ href, label, icon: Icon }) => {
        // Exact match only: /admin must not light up while you are on /admin/users.
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
