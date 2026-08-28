"use client";
import { Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useSettingsOverview, type SettingsPaneId } from "@/lib/hooks/useSettingsOverview";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { ALL_PANES, resolvePane } from "@/components/settings/sections";
import { GeneralSection } from "@/components/settings/GeneralSection";
import { ConnectionsSection } from "@/components/settings/ConnectionsSection";
import { ActivitySection } from "@/components/settings/ActivitySection";
import { BrandingSection } from "@/components/settings/BrandingSection";
import { BrandGuidelinesSection } from "@/components/settings/BrandGuidelinesSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { ApiKeysSection } from "@/components/settings/ApiKeysSection";
import { WebhooksSection } from "@/components/settings/WebhooksSection";
import { AutomationSection } from "@/components/settings/AutomationSection";
import { TeamSection } from "@/components/settings/TeamSection";

/**
 * Workspace settings.
 *
 * Ten sections used to be stacked into one column about two thousand pixels tall, at a single URL.
 * They are now eight panes behind a rail that carries each one's current value, and the open pane
 * lives in `?tab=` so a setting can be linked to — including by Stripe, which returns from checkout
 * to `?tab=billing&checkout=success` rather than to the top of an unrelated page.
 *
 * **Every pane stays mounted and is hidden rather than unmounted.** Two of them (Brand, Developer)
 * hold typed-but-unsaved form state, and switching panes must not quietly throw it away — that
 * would be a data-loss bug introduced by the redesign, which is a worse failure than the scrolling
 * it fixes. `hidden` keeps the panes out of the accessibility tree and out of layout, and every
 * query these sections issue was already issued by the old single-column page, so nothing extra is
 * fetched to buy that.
 */
export default function SettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <SettingsView />
    </Suspense>
  );
}

function SettingsView() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const memberships = useMemo(() => me?.data.memberships ?? [], [me]);
  const workspaceId = activeId ?? memberships[0]?.workspaceId ?? null;
  const membership = memberships.find((m) => m.workspaceId === workspaceId);
  const workspace = membership?.workspace;
  // Branding, guidelines, keys, webhooks, the refresh loop and the audit log are all admin-scoped
  // on the API. The rail hides what a viewer cannot open rather than showing them a locked door.
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const router = useRouter();
  const searchParams = useSearchParams();
  const active = resolvePane(searchParams.get("tab"), isAdmin);
  const status = useSettingsOverview(workspaceId, isAdmin);

  const select = useCallback(
    (id: SettingsPaneId) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", id);
      // `replace`, not `push`: flicking through settings panes should not fill the back button with
      // steps the reader has to unwind to leave the page.
      router.replace(`/settings?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const label = (id: SettingsPaneId) => ALL_PANES.find((p) => p.id === id)!.label;

  return (
    <div className="animate-rise">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace ? `Everything that shapes how GrowthOS behaves for ${workspace.name}.` : " "}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[15rem_minmax(0,1fr)]">
        <SettingsNav active={active} onSelect={select} status={status} isAdmin={isAdmin} />

        <div className="min-w-0">
          <Pane id="general" active={active} label={label("general")}>
            <GeneralSection workspace={workspace} />
          </Pane>

          <Pane id="billing" active={active} label={label("billing")}>
            <BillingSection workspaceId={workspaceId} isAdmin={isAdmin} />
          </Pane>

          <Pane id="team" active={active} label={label("team")}>
            <TeamSection workspaceId={workspaceId} isAdmin={isAdmin} />
          </Pane>

          <Pane id="connections" active={active} label={label("connections")}>
            <ConnectionsSection workspaceId={workspaceId} />
          </Pane>

          {isAdmin && (
            <>
              <Pane id="schedule" active={active} label={label("schedule")}>
                <AutomationSection workspaceId={workspaceId} />
              </Pane>

              {/* Branding and guidelines were always adjacent for the same reason they are now one
                  pane: both answer what the brand looks and sounds like. */}
              <Pane id="brand" active={active} label={label("brand")}>
                <BrandingSection workspaceId={workspaceId} />
                <BrandGuidelinesSection workspaceId={workspaceId} />
              </Pane>

              {/* The pull and push halves of one integration surface, behind one plan gate. */}
              <Pane id="developer" active={active} label={label("developer")}>
                <ApiKeysSection workspaceId={workspaceId} />
                <WebhooksSection workspaceId={workspaceId} />
              </Pane>

              <Pane id="activity" active={active} label={label("activity")}>
                <ActivitySection workspaceId={workspaceId} />
              </Pane>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * `hidden` on both the attribute and the class: the attribute is what removes an inactive pane from
 * the accessibility tree, and the class is what guarantees `display: none` regardless of what the
 * children's own styles set.
 */
function Pane({
  id,
  active,
  label,
  children,
}: {
  id: SettingsPaneId;
  active: SettingsPaneId;
  label: string;
  children: React.ReactNode;
}) {
  const shown = id === active;
  return (
    <section
      aria-label={label}
      hidden={!shown}
      className={cn("space-y-6", !shown && "hidden")}
    >
      {children}
    </section>
  );
}
