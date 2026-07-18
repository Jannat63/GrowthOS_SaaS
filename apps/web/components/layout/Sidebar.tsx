"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  BrainCircuit,
  FileText,
  Flame,
  Search,
  MousePointerClick,
  Megaphone,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { cn } from "@/lib/utils/cn";
import { useSidebarStore } from "@/lib/stores/sidebar";

// Ghost icon button restyled for the dark ink rail (tailwind-merge overrides the
// default light accent hover). Reused for both collapse/expand affordances.
const INK_ICON_BTN =
  "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground focus-visible:ring-primary/60 focus-visible:ring-offset-0";

const NAV = [
  { href: "/growth-hub", label: "Growth Hub", icon: LayoutDashboard, ready: true },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit, ready: true },
  { href: "/recommendations", label: "Recommendations", icon: Sparkles, ready: true },
  { href: "/content-pipeline", label: "Content Pipeline", icon: FileText, ready: true },
  { href: "/creative-queue", label: "Creative Queue", icon: Megaphone, ready: true },
  { href: "/fatigue-monitor", label: "Creative Fatigue", icon: Flame, ready: true },
  { href: "#", label: "SEO", icon: Search, ready: false },
  { href: "#", label: "Google Ads", icon: MousePointerClick, ready: false },
  { href: "#", label: "Meta Ads", icon: Megaphone, ready: false },
  { href: "/analytics", label: "Analytics", icon: BarChart3, ready: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const storedCollapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  // Guard against hydration mismatch: default to expanded until the persisted
  // value has rehydrated on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const collapsed = mounted && storedCollapsed;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink-border bg-ink text-ink-foreground transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center",
          collapsed ? "justify-center px-0" : "justify-between px-5"
        )}
      >
        {collapsed ? (
          // Collapsed: brand mark by default, swaps to the expand icon on hover.
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Expand sidebar"
            className={cn("group relative h-9 w-9 rounded-lg", INK_ICON_BTN)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary transition-opacity duration-200 group-hover:opacity-0">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground" />
            </span>
            <PanelLeftOpen className="absolute h-4 w-4 text-ink-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </Button>
        ) : (
          <>
            <Link
              href="/growth-hub"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">
                GrowthOS
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

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon, ready }) => {
          const active = ready && pathname === href;
          const base =
            "group relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors";
          const spacing = collapsed ? "justify-center px-0" : "gap-3 px-3";
          if (!ready) {
            return (
              <span
                key={label}
                title={label + " — coming soon"}
                className={cn(base, spacing, "cursor-default text-ink-muted/50")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    {label}
                    <span className="ml-auto rounded-full bg-ink-2 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-ink-muted/70">
                      Soon
                    </span>
                  </>
                )}
              </span>
            );
          }
          return (
            <Link
              key={label}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                base,
                spacing,
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
                  active
                    ? "text-primary"
                    : "text-ink-muted group-hover:text-ink-foreground"
                )}
              />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-border px-3 py-4">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "group flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
            pathname === "/settings"
              ? "bg-ink-2 text-ink-foreground"
              : "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && "Settings"}
        </Link>
      </div>
    </aside>
  );
}
