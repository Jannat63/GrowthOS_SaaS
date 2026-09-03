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
  GitBranch,
  Bot,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { cn } from "@/lib/utils/cn";
import { useSidebarStore } from "@/lib/stores/sidebar";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useBranding } from "@/lib/hooks/useBranding";
import { LogoMark } from "@/components/brand/LogoMark";
import { RailMarker } from "@/components/layout/RailMarker";

// Ghost icon button restyled for the dark ink rail (tailwind-merge overrides the
// default light accent hover). Reused for both collapse/expand affordances.
const INK_ICON_BTN =
  "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground focus-visible:ring-primary/60 focus-visible:ring-offset-0";

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; ready: boolean };
export type NavGroup = { label: string | null; items: NavItem[] };

// Ungrouped items (label: null) render at the top with no section header — the loop's core
// surfaces. Everything else is grouped to match the product's actual shape rather than a flat list.
// Exported so MobileNav renders the identical structure below `md` rather than a second,
// hand-maintained copy that could drift from this one.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/growth-hub", label: "Growth Hub", icon: LayoutDashboard, ready: true },
      { href: "/intelligence", label: "Intelligence", icon: BrainCircuit, ready: true },
      { href: "/recommendations", label: "Recommendations", icon: Sparkles, ready: true },
    ],
  },
  {
    label: "Channels",
    items: [
      { href: "/content-pipeline", label: "Content", icon: FileText, ready: true },
      { href: "/seo", label: "SEO", icon: Search, ready: true },
      { href: "/google-ads", label: "Google Ads", icon: MousePointerClick, ready: true },
      { href: "/meta-ads", label: "Meta Ads", icon: Megaphone, ready: true },
    ],
  },
  {
    label: "Creative",
    items: [
      { href: "/creative-queue", label: "Creative Queue", icon: Megaphone, ready: true },
      { href: "/fatigue-monitor", label: "Creative Fatigue", icon: Flame, ready: true },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3, ready: true },
      { href: "/attribution", label: "Attribution", icon: GitBranch, ready: true },
    ],
  },
  {
    label: "System",
    items: [{ href: "/automation", label: "Automation", icon: Bot, ready: true }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const storedCollapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  // White-label brand (M3 P3.5): agency name + logo override the GrowthOS defaults.
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const { data: branding } = useBranding(workspaceId);
  const brandName = branding?.data.agencyName || "GrowthOS";
  const logoUrl = branding?.data.logoUrl || null;

  // Guard against hydration mismatch: default to expanded until the persisted
  // value has rehydrated on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const collapsed = mounted && storedCollapsed;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-ink-border bg-ink text-ink-foreground transition-[width] duration-200 ease-out md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
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
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg transition-opacity duration-200 group-hover:opacity-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={brandName} className="h-full w-full object-cover" />
              ) : (
                <LogoMark />
              )}
            </span>
            <PanelLeftOpen className="absolute h-4 w-4 text-ink-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </Button>
        ) : (
          <>
            <Link
              href="/growth-hub"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={brandName} className="h-full w-full object-cover" />
                ) : (
                  <LogoMark />
                )}
              </span>
              <span className="truncate font-display text-lg font-semibold tracking-tight">
                {brandName}
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

      {/* The marker is a direct child of the scrolling nav so it travels with the list, and the
          groups keep their own wrapper so its out-of-flow presence cannot join the `space-y` run
          and push the first group down. */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4">
        <RailMarker />
        <div className="space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className={gi > 0 ? "pt-2" : undefined}>
            {group.label && !collapsed && (
              <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-muted/60">
                {group.label}
              </p>
            )}
            {group.label && collapsed && (
              <div className="mx-3 mb-2 border-t border-ink-border" aria-hidden="true" />
            )}
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon, ready }) => {
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
                    // What RailMarker measures against. The bar is no longer drawn inside the row,
                    // because a bar that belongs to a row cannot travel between rows.
                    data-rail-active={active ? "true" : undefined}
                    className={cn(
                      base,
                      spacing,
                      active
                        ? "bg-ink-2 text-ink-foreground"
                        : "text-ink-muted hover:bg-ink-2/60 hover:text-ink-foreground"
                    )}
                  >
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
            </div>
          </div>
        ))}
        </div>
      </nav>

      {/* Its own region, so it gets its own marker: the footer sits below a border and outside the
          scrolling list, and a bar cannot travel across that. Moving between the two cross-fades,
          which is what actually happened. */}
      <div className="relative shrink-0 border-t border-ink-border px-3 py-4">
        <RailMarker />
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          data-rail-active={pathname === "/settings" ? "true" : undefined}
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
      </div>
    </aside>
  );
}
