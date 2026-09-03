"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Settings } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@growthos/ui/components/dialog";
import { cn } from "@/lib/utils/cn";
import { NAV_GROUPS } from "./Sidebar";

/**
 * Below `md`, Sidebar renders nothing at all (`hidden md:flex`) — on a phone there was previously
 * no way to move between dashboard pages except editing the URL directly. This is that
 * replacement: a slide-in drawer reusing Sidebar's exported NAV_GROUPS so the two can't drift
 * apart, triggered from a menu button that only shows up on the breakpoint Sidebar hides at.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <Dialog>
      <DialogTrigger
        className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" />
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="md:hidden" />
        <DialogContent
          className={cn(
            "fixed inset-y-0 left-0 top-0 z-50 h-full w-72 max-w-[85vw] translate-x-0 translate-y-0",
            "flex flex-col overflow-y-auto rounded-none border-r bg-ink p-0 text-ink-foreground",
            "duration-200 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "sm:rounded-none md:hidden"
          )}
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex h-16 shrink-0 items-center px-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="h-3 w-3 rounded-sm bg-primary-foreground" />
            </span>
            <span className="ml-2.5 font-display text-base font-semibold tracking-tight">
              GrowthOS
            </span>
          </div>

          <nav className="flex-1 space-y-4 px-3 py-2">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label ?? `group-${gi}`} className={gi > 0 ? "pt-2" : undefined}>
                {group.label && (
                  <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-muted/60">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map(({ href, label, icon: Icon, ready }) => {
                    const active = ready && pathname === href;
                    if (!ready) {
                      return (
                        <span
                          key={label}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted/50"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {label}
                        </span>
                      );
                    }
                    return (
                      <DialogClose asChild key={label}>
                        <Link
                          href={href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-ink-2 text-ink-foreground"
                              : "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                          {label}
                        </Link>
                      </DialogClose>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-ink-border px-3 py-4">
            <DialogClose asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === "/settings"
                    ? "bg-ink-2 text-ink-foreground"
                    : "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </Link>
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
