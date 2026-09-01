"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, LayoutGrid, Building2, Users, ScrollText } from "lucide-react";
import { useAdminAccess } from "@/lib/hooks/useAdmin";
import { cn } from "@/lib/utils/cn";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, superAdminOnly: true },
];

/**
 * Everything under (admin) is gated here — a non-admin sees a plain "not authorized" screen, never
 * the panel itself. This is a UX gate, not the real security boundary: every API route under
 * /admin/* independently requires a platform role server-side (apps/api/src/routes/admin.ts), so
 * there's no path where getting past this layout alone exposes real data.
 *
 * Deliberately styled nothing like the customer dashboard (no shared Sidebar/TopBar, a solid dark
 * header with a hazard-striped accent) — the point is that an admin should never be able to
 * mistake which surface they're looking at, especially mid-impersonation-adjacent work.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: access, isLoading } = useAdminAccess();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-sm text-neutral-500">Checking admin access…</p>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center text-neutral-100">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="font-display text-xl font-semibold">Not authorized</h1>
        <p className="max-w-sm text-sm text-neutral-400">
          This area is restricted to GrowthOS platform admins. If you believe this is a mistake,
          contact whoever manages platform access.
        </p>
        <button
          onClick={() => router.push("/growth-hub")}
          className="mt-2 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-700"
        >
          Back to GrowthOS
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Hazard-striped top accent — the one visual element with no equivalent anywhere in the
          customer app, so it's unmistakable at a glance which surface is on screen. */}
      <div
        aria-hidden="true"
        className="h-1.5 w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #f59e0b 0px, #f59e0b 10px, #0a0a0a 10px, #0a0a0a 20px)",
        }}
      />
      <header className="flex h-14 items-center justify-between border-b border-neutral-800 px-6">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
          <span className="font-display text-sm font-semibold tracking-wide">
            GrowthOS Super Admin
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-500">
            {access.platformRole === "super_admin" ? "Super Admin" : "Support Agent"}
          </span>
        </div>
        <Link href="/growth-hub" className="text-xs font-medium text-neutral-400 hover:text-neutral-100">
          Exit to GrowthOS →
        </Link>
      </header>

      <div className="flex">
        <nav className="w-56 shrink-0 space-y-1 border-r border-neutral-800 p-4">
          {ADMIN_NAV.map(({ href, label, icon: Icon, superAdminOnly }) => {
            if (superAdminOnly && access.platformRole !== "super_admin") return null;
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-neutral-800 text-neutral-50" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
