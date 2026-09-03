"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutGrid, ScrollText, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@growthos/ui/components/tooltip";
import { cn } from "@/lib/utils/cn";

/**
 * The console's section navigation.
 *
 * It used to be a 224px labelled sidebar holding four links — a permanent eighth of the window
 * spent on a list an operator memorises in a day, taken from tables that want every pixel of
 * width. Finding a specific account is the palette's job (Cmd-K); this is only for the handful of
 * destinations that are not an account, so it is a 52px rail of icons with tooltips.
 *
 * Below `md` it becomes a labelled horizontal strip instead: a phone has no hover, so an
 * icon-only rail there would be a row of unexplained glyphs.
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
    <TooltipProvider delayDuration={200}>
      <nav
        aria-label="Console sections"
        className={cn(
          "flex shrink-0 gap-1 overflow-x-auto border-b p-2",
          "md:w-[52px] md:flex-col md:overflow-visible md:border-b-0 md:border-r md:py-3"
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
                "md:h-9 md:w-9 md:justify-center md:px-0 md:py-0",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="md:sr-only">{label}</span>
            </Link>
          );

          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              {/* Hidden below md, where the label is already on screen. */}
              <TooltipContent side="right" className="hidden md:block">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
