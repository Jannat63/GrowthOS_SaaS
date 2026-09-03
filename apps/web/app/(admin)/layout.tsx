"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, ShieldAlert } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import { useAdminAccess } from "@/lib/hooks/useAdmin";
import { useSession } from "@/lib/auth/client";
import { AdminRail } from "@/components/admin/AdminRail";
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
 * **The whole surface is scoped `dark`, in every theme.** That is the safeguard: an operator must
 * never mistake a customer's account for their own workspace, and a console that inverts with the
 * theme can end up looking exactly like the customer app. Scoping the class rather than hardcoding
 * a grey ramp means the shadcn primitives inside resolve to the graphite palette on their own —
 * `--card`, `--border`, `--input` and the rest all move together — so `<Button>` and `<Input>` are
 * usable here unmodified, and nothing has to be re-toned per instance.
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

  useEffect(() => {
    if (profileIncomplete && !onWelcome) router.replace("/admin/welcome");
  }, [profileIncomplete, onWelcome, router]);

  if (isLoading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking admin access…</p>
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

  const isSuperAdmin = access.platformRole === "super_admin";

  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/*
        The signature, and the one place this surface raises its voice.

        This replaced a hazard-striped bar. A stripe says "somewhere dangerous" and then leaves the
        operator to remember why; gold is the colour this design system already uses for "not the
        normal state", so the meaning is borrowed rather than invented. What it stands for — that
        every view here is recorded under your name — now lives in the operator menu, attached to
        the name it is about, instead of as a caption addressed to nobody.
      */}
      <div aria-hidden="true" className="h-0.5 w-full shrink-0 bg-warning" />

      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-4">
        <div className="flex shrink-0 items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" />
          <span className="font-display text-sm font-semibold tracking-tight">Super Admin</span>
        </div>

        {/*
          The search field is the console's primary navigation, so it sits in the centre of the
          header rather than at the top of one page. It is a button, not an input: the palette owns
          its own field, and two focusable text boxes for one search is a trap for keyboard users.
        */}
        {/* Hidden during the profile wall for the same reason the rail is: the palette navigates. */}
        {!profileIncomplete && (
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

        <div className="ml-auto shrink-0">
          <OperatorMenu platformRole={access.platformRole} />
        </div>
      </header>

      {/*
        The shell owns the viewport height, and only the content column scrolls. The sidebar and
        header were scrolling away with the page, which on a long directory left an operator with
        no navigation and no way back without scrolling to the top first.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* The profile step is a wall, not a page: no navigation out of it until there is a name. */}
        {!profileIncomplete && <AdminRail isSuperAdmin={isSuperAdmin} />}
        {/*
          No max-width container. The customer app centres its content because it is read; this is
          scanned across, and every column of a directory is width the operator asked for.
        */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      {!profileIncomplete && (
        <AdminCommandPalette
          open={palette.open}
          onOpenChange={palette.setOpen}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
