"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Laptop, ShieldAlert } from "lucide-react";
import type { PlatformRole } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { Separator } from "@growthos/ui/components/separator";
import {
  useAdminAccess,
  useAdminUserDetail,
  useRevokeSessions,
  useSetPlatformRole,
} from "@/lib/hooks/useAdmin";
import { useSession } from "@/lib/auth/client";
import { ReasonAction } from "@/components/admin/ReasonAction";
import { platformRoleLabel, workspaceRoleLabel } from "@/components/admin/labels";
import { absoluteTime, relativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

/**
 * One person's file.
 *
 * The console could list people and nothing else — there was no way to open one, so "who is this,
 * what do they have access to, and are they signed in anywhere" could only be answered against the
 * database. This is that page, plus the two actions that belong to it.
 *
 * Both actions are super-admin only and both are refused for your own account. Removing your own
 * platform role through the only interface that can restore it is a lockout, and the server rejects
 * it — the buttons are simply not rendered rather than offered and then refused.
 */

const ROLES: { value: PlatformRole | null; label: string; note: string }[] = [
  { value: null, label: "Customer", note: "No access to this console." },
  {
    value: "support_agent",
    label: "Support agent",
    note: "Can read every account. Cannot change billing or platform access.",
  },
  {
    value: "super_admin",
    label: "Super admin",
    note: "Everything, including this page and the audit log.",
  },
];

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: user, isLoading, isError } = useAdminUserDetail(id);
  const { data: access } = useAdminAccess();
  const { data: session } = useSession();

  const setRole = useSetPlatformRole(id);
  const revoke = useRevokeSessions(id);
  const [nextRole, setNextRole] = useState<PlatformRole | null | undefined>(undefined);

  const isSuperAdmin = access?.platformRole === "super_admin";
  const isSelf = session?.user.id === id;

  if (isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">No account with that ID.</p>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {user.name || "No name set"}
          </h1>
          {user.platformRole && (
            <Badge variant="warning">{platformRoleLabel(user.platformRole)}</Badge>
          )}
          {isSelf && <Badge variant="muted">This is you</Badge>}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
          <span>{user.email}</span>
          {user.phone && <span>{user.phone}</span>}
          <span title={absoluteTime(user.createdAt)}>Joined {relativeTime(user.createdAt)}</span>
          <span title={absoluteTime(user.lastSeenAt)}>
            {user.lastSeenAt ? `Last seen ${relativeTime(user.lastSeenAt)}` : "Not signed in lately"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="p-5">
          <h2 className="font-display text-base font-semibold tracking-tight">Workspaces</h2>
          {user.memberships.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This account belongs to no workspace. Either it never finished signing up, or it is
              platform staff — who do not need one.
            </p>
          ) : (
            <ul className="mt-3 divide-y">
              {user.memberships.map((m) => (
                <li key={m.workspaceId} className="flex items-center justify-between gap-4 py-2.5">
                  <Link
                    href={`/admin/workspaces/${m.workspaceId}`}
                    className="min-w-0 truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {m.workspaceName}
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {workspaceRoleLabel(m.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base font-semibold tracking-tight">Signed in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sessions are deleted when they expire, so this is where they are signed in now.
          </p>

          {user.sessions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nowhere.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {user.sessions.map((s) => (
                <li key={s.id} className="flex items-start gap-3 py-2.5">
                  <Laptop
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" title={s.userAgent ?? undefined}>
                      {describeDevice(s.userAgent)}
                    </p>
                    <p className="flex flex-wrap gap-x-4 font-mono text-xs text-muted-foreground">
                      <span>{s.ipAddress ?? "no address recorded"}</span>
                      <span title={absoluteTime(s.lastUsedAt)}>
                        active {relativeTime(s.lastUsedAt)}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isSuperAdmin && !isSelf && user.sessions.length > 0 && (
            <>
              <Separator className="my-5" />
              <ReasonAction
                title="Sign out everywhere"
                description="Ends every session immediately. They will have to sign in again on each device. For a lost laptop or a shared password."
                confirmLabel="Sign them out"
                destructive
                pending={revoke.isPending}
                confirmation={
                  <>
                    End all {user.sessions.length} sessions for{" "}
                    <span className="font-mono">{user.email}</span>?
                  </>
                }
                onConfirm={(reason) => revoke.mutate({ reason })}
              />
            </>
          )}
        </Card>
      </div>

      {isSuperAdmin && (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold tracking-tight">Platform access</h2>
          </div>

          {isSelf ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You cannot change your own access here. This console is the only place it can be
              changed, so removing your own role would lock you out of the page that could put it
              back. Ask another super admin.
            </p>
          ) : (
            <div className="mt-4">
              <ReasonAction
                title="Change what this person can reach"
                description="Platform access is separate from any workspace role. It is granted here or by the grant-admin script, never through a form the account holder can reach."
                confirmLabel="Change access"
                destructive={nextRole === "super_admin"}
                ready={nextRole !== undefined && nextRole !== user.platformRole}
                pending={setRole.isPending}
                confirmation={
                  <>
                    {nextRole === null ? (
                      <>
                        Remove all platform access from{" "}
                        <span className="font-mono">{user.email}</span>? They keep their workspaces
                        and lose this console.
                      </>
                    ) : (
                      <>
                        Make <span className="font-mono">{user.email}</span> a{" "}
                        {nextRole ? platformRoleLabel(nextRole).toLowerCase() : ""}? They will be
                        able to read every customer account on the platform.
                      </>
                    )}
                  </>
                }
                onConfirm={(reason) => {
                  if (nextRole === undefined) return;
                  setRole.mutate(
                    { role: nextRole, reason },
                    { onSuccess: () => setNextRole(undefined) }
                  );
                }}
              >
                <div className="flex flex-col gap-1.5">
                  {ROLES.map((r) => {
                    const current = r.value === user.platformRole;
                    const selected = nextRole === r.value;
                    return (
                      <button
                        key={r.label}
                        type="button"
                        disabled={current}
                        aria-pressed={selected}
                        onClick={() => setNextRole(selected ? undefined : r.value)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "disabled:cursor-default disabled:opacity-60",
                          selected
                            ? "border-primary/50 bg-primary/10"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {r.label}
                          {current && (
                            <span className="text-xs font-normal text-muted-foreground">
                              current
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{r.note}</span>
                      </button>
                    );
                  })}
                </div>
              </ReasonAction>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/users"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All people
    </Link>
  );
}

/**
 * A user-agent string is unreadable and the full value is already on the row's `title`. This gives
 * the operator the thing they are actually checking — is that the phone or the work laptop.
 */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unrecognised device";
  const ua = userAgent.toLowerCase();
  const os = ua.includes("iphone")
    ? "iPhone"
    : ua.includes("ipad")
      ? "iPad"
      : ua.includes("android")
        ? "Android"
        : ua.includes("mac os")
          ? "Mac"
          : ua.includes("windows")
            ? "Windows"
            : ua.includes("linux")
              ? "Linux"
              : "Unknown device";
  // Order matters: Edge and Chrome both claim Safari, and Edge also claims Chrome.
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("firefox")
      ? "Firefox"
      : ua.includes("chrome")
        ? "Chrome"
        : ua.includes("safari")
          ? "Safari"
          : "unknown browser";
  return `${browser} on ${os}`;
}
