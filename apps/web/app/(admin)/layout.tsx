"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, ShieldAlert } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { useAdminAccess } from "@/lib/hooks/useAdmin";
import { useSession } from "@/lib/auth/client";
import { AdminRail, AdminNavStrip } from "@/components/admin/AdminRail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageTransition } from "@/components/PageTransition";
import { OperatorMenu } from "@/components/admin/OperatorMenu";
import {
  AdminCommandPalette,
  useCommandPalette,
} from "@/components/admin/AdminCommandPalette";

/**
 * Everything under (admin) is gated here — a non-admin sees a plain "not authorized" screen, never
 * the console itself. This is a UX gate, not the real security boundary: every API route under
 * /admin/* independently requires a platform role server-side (apps/api/src/routes/admin.ts), so
 * there's no path where getting past this layout alone exposes real data.
 *
 * **The console follows the chosen theme.** It used to be scoped `dark` in every theme, as a
 * safeguard against mistaking a customer's account for your own workspace. That had a defect that
 * gave the game away: Radix portals every dialog and the command palette to `document.body`, which
 * is *outside* the scoped element, so those surfaces resolved against the light tokens and opened
 * as bright panels over a graphite page. Scoping the class on a subtree cannot cover anything that
 * escapes the subtree.
 *
 * What still marks this as the console, in either theme: the gold hairline across the top, the
 * shield and its name in the header, and the standing warning in the operator menu that everything
 * here is recorded under your name. Those do not depend on the surface being dark.
 *
 * The shell is a 52px icon rail plus a single header bar, not the customer app's sidebar-and-
 * header. Finding an account is the command palette's job; the rail carries only the destinations
 * that are not an account. See docs/superpowers/specs/2026-09-03-admin-console-redesign-design.md.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: access, isLoading } = useAdminAccess();
  const { data: session, isPending: sessionPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const palette = useCommandPalette();

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

  /**
   * Two-factor is required of platform staff before the console opens.
   *
   * A wall, not a reminder: this surface reads every customer account on the platform, and a
   * security control that can be dismissed is one that will be. It sits beside the profile gate for
   * the same reason that one does — sign-in is not the only way in, so a check on the sign-in
   * handler alone is a check that can be walked around by typing /admin.
   *
   * The server still holds the real line. This gate only decides what renders; every admin route
   * independently requires a platform role, and Better Auth independently refuses to issue a
   * session for a 2FA account until a code is verified.
   */
  const twoFactorMissing =
    Boolean(access) &&
    !sessionPending &&
    !(session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled;
  const onSecurity = pathname === "/admin/security";

  useEffect(() => {
    if (profileIncomplete && !onWelcome) {
      router.replace("/admin/welcome");
      return;
    }
    // Name first: the audit log needs someone to write down before it is worth protecting.
    if (!profileIncomplete && twoFactorMissing && !onSecurity) router.replace("/admin/security");
  }, [profileIncomplete, onWelcome, twoFactorMissing, onSecurity, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking admin access…</p>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
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

  const isSuperAdmin = access.platformRole === "super_admin";
  // Either wall hides the way out of it.
  const walled = profileIncomplete || twoFactorMissing;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/*
        The signature, and the one place this surface raises its voice.

        This replaced a hazard-striped bar. A stripe says "somewhere dangerous" and then leaves the
        operator to remember why; gold is the colour this design system already uses for "not the
        normal state", so the meaning is borrowed rather than invented. What it stands for — that
        every view here is recorded under your name — lives in the operator menu, attached to the
        name it is about, rather than as a caption addressed to nobody.
      */}
      <div aria-hidden="true" className="h-0.5 w-full shrink-0 bg-warning" />

      {/*
        The same shell as the customer dashboard: a full-height rail on the left carrying the mark
        and the sections, and a column beside it with the header and the only scrolling region.
        The console's name sits in the rail, not the header, for the same reason the product's logo
        does over there.
      */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Both walls hide navigation: no way out of them until they are satisfied. */}
        {!walled && <AdminRail isSuperAdmin={isSuperAdmin} />}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
            {/*
              The search field is the console's primary navigation. It is a button, not an input:
              the palette owns its own field, and two focusable text boxes for one search is a trap
              for keyboard users.
            */}
            {!walled && (
              <button
                type="button"
                onClick={() => palette.setOpen(true)}
                className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-input bg-transparent px-3 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:max-w-md"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Find an account, a person, an id…</span>
                <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 font-mono text-[10px] leading-4 text-muted-foreground sm:block">
                  ⌘K
                </kbd>
              </button>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <OperatorMenu platformRole={access.platformRole} />
            </div>
          </header>

          {/* The rail is hidden below md, so the sections need somewhere else to live there. */}
          {!walled && <AdminNavStrip isSuperAdmin={isSuperAdmin} />}

          {/*
            The only scrolling region. The rail and header keep their place, which on a long
            directory is the difference between navigation being there and having to scroll to the
            top to find it.

            No max-width: the customer app centres its content because it is read; this is scanned
            across, and every column of a directory is width the operator asked for.
          */}
          <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>

      {!walled && (
        <AdminCommandPalette
          open={palette.open}
          onOpenChange={palette.setOpen}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
