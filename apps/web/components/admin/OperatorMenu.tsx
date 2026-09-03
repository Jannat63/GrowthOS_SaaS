"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, ShieldCheck, UserCog } from "lucide-react";
import type { PlatformRole } from "@growthos/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@growthos/ui/components/dropdown-menu";
import { signOut, useSession } from "@/lib/auth/client";
import { useOperatorIdentity } from "@/lib/hooks/useAdmin";
import { platformRoleLabel } from "@/components/admin/labels";

/**
 * Who is operating, and the two ways out.
 *
 * This is also where the console's one standing warning lives. It used to sit in the header as a
 * tracked-out caption reading "Every view is recorded" — permanently on screen, addressed to
 * nobody, and after a week of that it is wallpaper. Attached to the operator's own name it says
 * the thing that actually makes someone careful: the name in this record is yours.
 *
 * **"Open GrowthOS" appears only when the operator has a workspace.** The old header linked
 * unconditionally to /growth-hub, and platform staff own no workspace by design, so the console's
 * only visible exit led to a dashboard with nothing in it. An operator with no workspace gets
 * "Sign out" instead, which is the honest option.
 */
export function OperatorMenu({ platformRole }: { platformRole: PlatformRole }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: me } = useOperatorIdentity();

  const name = (session?.user.name ?? "").trim();
  const email = session?.user.email ?? "";
  const hasWorkspace = (me?.memberships.length ?? 0) > 0;

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        <span className="max-w-[10rem] truncate font-medium text-foreground">
          {name || email || "Signed in"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium">{name || "No name set"}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{email}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Signed in as {platformRoleLabel(platformRole).toLowerCase()}. Everything you open here
            is written to the audit log under your name, including pages you only look at.
          </p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => router.push("/admin/welcome")}>
          <UserCog className="h-4 w-4" aria-hidden="true" />
          Edit your details
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => router.push("/admin/security")}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Two-factor
        </DropdownMenuItem>

        {hasWorkspace && (
          <DropdownMenuItem onSelect={() => router.push("/growth-hub")}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open GrowthOS
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
