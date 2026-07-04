"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hexagon,
  Home,
  Sparkles,
  Search,
  BadgeDollarSign,
  Instagram,
  BrainCircuit,
  BarChart3,
  FileText,
  Target,
  Telescope,
  Rocket,
  Plug,
  Building2,
  Settings,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
}

const mainNav: NavItem[] = [
  { label: "Growth Hub", href: "/growth-hub", icon: Home },
  { label: "Opportunities", href: "/opportunities", icon: Sparkles },
];

const moduleNav: NavItem[] = [
  { label: "SEO", href: "/seo", icon: Search },
  { label: "Google Ads", href: "/google-ads", icon: BadgeDollarSign },
  { label: "Meta Ads", href: "/meta-ads", icon: Instagram },
  { label: "Intelligence Center", href: "/intelligence-center", icon: BrainCircuit },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Growth Command Center", href: "/growth-command-center", icon: Target },
  { label: "Future Forecasting", href: "/future-forecasting", icon: Telescope },
  { label: "Optimization Engine", href: "/optimization-engine", icon: Rocket },
];

const bottomNav: NavItem[] = [
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Workspace & Billing", href: "/workspace-billing", icon: Building2 },
  { label: "Settings & Help", href: "/settings-help", icon: Settings },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-primary text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ workspaceName = "Acme Inc." }: { workspaceName?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[240px] flex-col bg-[#0b1220] px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 py-2 mb-6">
        <Hexagon className="h-6 w-6 text-primary" fill="currentColor" strokeWidth={0} />
        <span className="text-white font-semibold text-[15px]">GrowthOS</span>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-6">
        <div className="space-y-1">
          <div className="px-3 pb-1 text-caption font-medium text-slate-500 uppercase tracking-wide">
            Main Navigation
          </div>
          {mainNav.map((item) => (
            <NavLink key={item.href} item={item} active={pathname?.startsWith(item.href) ?? false} />
          ))}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-caption font-medium text-slate-500 uppercase tracking-wide">
            Modules
          </div>
          {moduleNav.map((item) => (
            <NavLink key={item.href} item={item} active={pathname?.startsWith(item.href) ?? false} />
          ))}
        </div>

        <div className="space-y-1">
          {bottomNav.map((item) => (
            <NavLink key={item.href} item={item} active={pathname?.startsWith(item.href) ?? false} />
          ))}
        </div>
      </nav>

      {/* Workspace switcher */}
      <button className="flex items-center justify-between px-3 py-2 mt-2 rounded-lg bg-white/5 text-slate-300 text-sm hover:bg-white/10">
        <span>{workspaceName}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
    </aside>
  );
}
