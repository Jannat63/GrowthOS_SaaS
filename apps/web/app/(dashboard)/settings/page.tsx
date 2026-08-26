"use client";
import { Suspense } from "react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { ConnectionsSection } from "@/components/settings/ConnectionsSection";
import { ActivitySection } from "@/components/settings/ActivitySection";
import { BrandingSection } from "@/components/settings/BrandingSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { ApiKeysSection } from "@/components/settings/ApiKeysSection";
import { WebhooksSection } from "@/components/settings/WebhooksSection";
import { AutomationSection } from "@/components/settings/AutomationSection";
import { TeamSection } from "@/components/settings/TeamSection";

export default function SettingsPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const memberships = me?.data.memberships ?? [];
  const workspaceId = activeId ?? memberships[0]?.workspaceId ?? null;
  const membership = memberships.find((m) => m.workspaceId === workspaceId);
  const workspace = membership?.workspace;
  // Branding editing + audit log are admin-scoped on the API — surface those sections to owners/admins.
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

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
        <BillingSection workspaceId={workspaceId} isAdmin={isAdmin} />
      </Suspense>

      {isAdmin && <BrandingSection workspaceId={workspaceId} />}

      {isAdmin && <ApiKeysSection workspaceId={workspaceId} />}

      {/* Directly after API keys: same Scale gate, same admin-only sensitivity, and webhooks are
          the push half of the same product — a reader looking for one is looking for both. */}
      {isAdmin && <WebhooksSection workspaceId={workspaceId} />}

      {isAdmin && <AutomationSection workspaceId={workspaceId} />}

      <Suspense fallback={null}>
        <ConnectionsSection workspaceId={workspaceId} />
      </Suspense>

      <TeamSection workspaceId={workspaceId} isAdmin={isAdmin} />

      {isAdmin && <ActivitySection workspaceId={workspaceId} />}
    </div>
  );
}
