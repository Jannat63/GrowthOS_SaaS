"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, LayoutGrid, Building2, Users, ScrollText } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { useAdminAccess } from "@/lib/hooks/useAdmin";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils/cn";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, superAdminOnly: true },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  support_agent: "Support agent",
};

/**
 * Everything under (admin) is gated here — a non-admin sees a plain "not authorized" screen, never
 * the panel itself. This is a UX gate, not the real security boundary: every API route under
 * /admin/* independently requires a platform role server-side (apps/api/src/routes/admin.ts), so
 * there's no path where getting past this layout alone exposes real data.
 *
 * **The whole surface is scoped `dark`, in every theme.** That is the safeguard: an operator must
 * never mistake a customer's account for their own workspace, and a console that inverts with the
 * theme can end up looking exactly like the customer app. Scoping the class rather than hardcoding
 * a grey ramp means the shadcn primitives inside resolve to the graphite palette on their own —
 * `--card`, `--border`, `--input` and the rest all move together — so `<Button>` and `<Input>` are
 * usable here unmodified, and nothing has to be re-toned per instance.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: access, isLoading } = useAdminAccess();
  const { data: session, isPending: sessionPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Platform staff complete their profile before the console opens.
   *
   * The gate lives here rather than in the sign-in handler because sign-in is not the only way in:
   * the console is reachable by typing /admin, from the account menu, and from a bookmark. A check
   * on one of those paths is a check that can be walked around.
   *
   * `name` is NOT NULL on the row, so an incomplete profile is an empty string, not null.
   */
  const profileIncomplete =
    Boolean(access) && !sessionPending && (session?.user.name ?? "").trim().length === 0;
  const onWelcome = pathname === "/admin/welcome";

  useEffect(() => {
    if (profileIncomplete && !onWelcome) router.replace("/admin/welcome");
  }, [profileIncomplete, onWelcome, router]);

  if (isLoading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground">
          Checking admin access…
        </p>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="dark flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <ShieldAlert className="h-9 w-9 text-destructive" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold tracking-tight">Not authorized</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          The admin console is restricted to GrowthOS platform staff. If you should have access,
          ask whoever manages platform roles to grant it.
        </p>
        <Button variant="secondary" className="mt-2" onClick={() => router.push("/growth-hub")}>
          Back to GrowthOS
        </Button>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/*
        The signature, and the one place this surface raises its voice.

        This replaced a hazard-striped bar. A stripe says "somewhere dangerous" and then leaves the
        operator to remember why; the line says the thing that actually makes someone careful —
        every view here, not just every change, is written to the audit log under their name. Gold
        because in this design system gold already means "not the normal state" (it is the
        sample-data colour), so the meaning is borrowed rather than invented.
      */}
      <div aria-hidden="true" className="h-0.5 w-full bg-warning" />

      <header className="flex h-14 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-6">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" />
          <span className="font-display text-sm font-semibold tracking-tight">Super Admin</span>
          <span className="rounded-full bg-warning/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-warning">
            {ROLE_LABEL[access.platformRole] ?? access.platformRole}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <p className="hidden font-mono text-[10px] tracking-[0.12em] text-muted-foreground sm:block">
            Every view is recorded
          </p>
          <Link
            href="/growth-hub"
            className="rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Exit to GrowthOS
          </Link>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {!profileIncomplete && (
        <nav
          aria-label="Admin sections"
          className="flex gap-1 overflow-x-auto border-b p-3 md:w-56 md:shrink-0 md:flex-col md:space-y-1 md:overflow-visible md:border-b-0 md:border-r md:p-4"
        >
          {ADMIN_NAV.map(({ href, label, icon: Icon, superAdminOnly }) => {
            if (superAdminOnly && access.platformRole !== "super_admin") return null;
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
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        )}
        <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
