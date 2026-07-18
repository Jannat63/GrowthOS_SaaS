"use client";
import { Suspense } from "react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useMembers } from "@/lib/hooks/useMembers";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { ConnectionsSection } from "@/components/settings/ConnectionsSection";
import { ActivitySection } from "@/components/settings/ActivitySection";

const ROLE_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  owner: "default",
  admin: "default",
  manager: "muted",
  viewer: "outline",
  client: "outline",
};

export default function SettingsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const memberships = me?.data.memberships ?? [];
  const workspaceId = activeId ?? memberships[0]?.workspaceId ?? null;
  const membership = memberships.find((m) => m.workspaceId === workspaceId);
  const workspace = membership?.workspace;
  // Audit log is admin-scoped on the API — only surface the section to owners/admins.
  const canViewActivity = membership?.role === "owner" || membership?.role === "admin";

  const { data: members } = useMembers(workspaceId);

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace and team.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">General</h2>
        {workspace ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</dt>
              <dd className="mt-1 text-sm font-medium">{workspace.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">URL</dt>
              <dd className="mt-1 text-sm font-medium">growthos.app/{workspace.slug}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</dt>
              <dd className="mt-1">
                <Badge variant="muted" className="capitalize">
                  {workspace.plan}
                </Badge>
              </dd>
            </div>
          </dl>
        ) : (
          <Skeleton className="mt-4 h-16 w-full" />
        )}
      </Card>

      <Suspense fallback={null}>
        <ConnectionsSection workspaceId={workspaceId} />
      </Suspense>

      <Card className="p-6">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Team</h2>
          {members && <DataSourceBadge source={members.source} />}
        </div>
        <div className="mt-4">
          {members ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[m.role] ?? "outline"} className="capitalize">
                        {m.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Skeleton className="h-32 w-full" />
          )}
        </div>
        {/* Invites (Resend email) arrive with M5 lifecycle emails. */}
      </Card>

      {canViewActivity && <ActivitySection workspaceId={workspaceId} />}
    </div>
  );
}
