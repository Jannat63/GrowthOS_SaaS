"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Check, Plus, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@growthos/ui/components/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { signOut } from "@/lib/auth/client";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useAdminAccess } from "@/lib/hooks/useAdmin";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { MobileNav } from "@/components/layout/MobileNav";

export function TopBar() {
  const router = useRouter();
  const { data } = useWorkspace();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();

  const memberships = data?.data.memberships ?? [];
  const user = data?.data.user;

  // Returns null (not an error) for everyone without a platform role, and `/admin/me` is the one
  // admin route that writes no audit-log row — so asking on every dashboard load costs a cached
  // request and nothing in the compliance record.
  const { data: adminAccess } = useAdminAccess();
  const platformRole = adminAccess?.platformRole ?? null;

  // Default the active workspace to the first membership once loaded.
  useEffect(() => {
    if (!activeWorkspaceId && memberships[0]) {
      setActiveWorkspaceId(memberships[0].workspaceId);
    }
  }, [activeWorkspaceId, memberships, setActiveWorkspaceId]);

  const active =
    memberships.find((m) => m.workspaceId === activeWorkspaceId) ?? memberships[0];

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center justify-between gap-4 px-4 md:px-8 xl:px-10">
      {/* Mobile nav trigger — hidden md:up since Sidebar takes over there */}
      <div className="flex items-center gap-2">
        <MobileNav />

      {/* Workspace switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[0.65rem] font-semibold text-primary-foreground">
            {(active?.workspace.name ?? "W")[0]?.toUpperCase()}
          </span>
          <span className="min-w-0 text-left leading-tight">
            <span className="block max-w-[11rem] truncate">
              {active?.workspace.name ?? "Workspace"}
            </span>
            {active?.workspace.slug && (
              <span className="block max-w-[11rem] truncate font-mono text-[0.65rem] font-normal text-muted-foreground">
                /{active.workspace.slug}
              </span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        {/*
          Every row carries its slug and role, not just its name.

          Two workspaces are allowed to share a name and in practice do — the list rendered
          "Shihab OS" twice with nothing to tell the two apart, so picking the right one was a
          coin toss you could not even tell you had lost. The slug is the thing that is actually
          unique, so it is what disambiguates; the role is there because which account you are in
          and what you may do in it are the two things you need before you switch.
        */}
        <DropdownMenuContent align="start" className="w-[17.5rem] p-0">
          <DropdownMenuLabel className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="m-0" />
          {/* Capped rather than unbounded: an agency with twenty clients would otherwise render a
              menu taller than the viewport, with the create action pushed off the bottom. */}
          <div className="max-h-72 overflow-y-auto py-1">
            {memberships.map((m) => {
              const isActive = m.workspaceId === active?.workspaceId;
              return (
                <DropdownMenuItem
                  key={m.workspaceId}
                  onClick={() => setActiveWorkspaceId(m.workspaceId)}
                  className="mx-1 flex items-start gap-2.5 rounded-md px-2 py-2"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[0.65rem] font-semibold",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {(m.workspace.name || "W")[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.workspace.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[0.7rem] text-muted-foreground">
                      /{m.workspace.slug}
                      <span className="ml-1.5 font-sans capitalize">· {m.role}</span>
                    </span>
                  </span>
                  {isActive && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label="Current workspace" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
          <DropdownMenuSeparator className="m-0" />
          {/* There was no way to add a workspace from the one control whose whole subject is
              which workspace you are in. */}
          <DropdownMenuItem asChild className="mx-1 my-1 rounded-md px-2 py-2">
            <Link href="/create-workspace" className="flex items-center gap-2.5 text-sm">
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Create workspace
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {/* Right side */}
      {/* The cross-channel DataSourceBadge used to sit here as well as in each page header —
          same words, same colour, ~130px apart. The page-level one is the more useful of the two
          because it is scoped to the module being read, so this copy is gone. */}
      <div className="flex items-center gap-2.5">
        <NotificationCenter workspaceId={active?.workspaceId ?? null} />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-transform hover:scale-105",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            {initials}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate font-medium">{user?.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/*
              The only route into the admin console from inside the product.

              Platform staff sign in through the ordinary customer flow, so an admin with no
              workspace of their own lands in onboarding with nothing anywhere on screen saying the
              panel exists — the URL had to be known and typed. It sits in the account menu rather
              than the sidebar because a platform role belongs to the person, not to the workspace
              they happen to be looking at.
            */}
            {platformRole && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <ShieldAlert className="mr-2 h-4 w-4 text-warning" />
                    Admin console
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </header>
  );
}
