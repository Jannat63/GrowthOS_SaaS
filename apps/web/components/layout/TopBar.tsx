"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Check } from "lucide-react";
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
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/layout/NotificationCenter";

export function TopBar() {
  const router = useRouter();
  const { data } = useWorkspace();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();

  const memberships = data?.data.memberships ?? [];
  const user = data?.data.user;

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
      {/* Workspace switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[0.6rem] font-semibold text-primary-foreground">
            {(active?.workspace.name ?? "W")[0]?.toUpperCase()}
          </span>
          <span className="max-w-[12rem] truncate">
            {active?.workspace.name ?? "Workspace"}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {memberships.map((m) => (
            <DropdownMenuItem
              key={m.workspaceId}
              onClick={() => setActiveWorkspaceId(m.workspaceId)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{m.workspace.name}</span>
              {m.workspaceId === active?.workspaceId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Right side */}
      <div className="flex items-center gap-2.5">
        <DataSourceBadge source={data?.source ?? "mock"} />
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
