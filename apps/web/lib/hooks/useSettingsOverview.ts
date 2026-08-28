"use client";
import { useMemo } from "react";
import { PLAN_LIMITS, type Plan } from "@growthos/types";
import { useSubscription } from "./useBilling";
import { useBranding } from "./useBranding";
import { useBrandGuidelines } from "./useBrandGuidelines";
import { useConnections } from "./useConnections";
import { useAutomation } from "./useAutomation";
import { useApiKeys } from "./useApiKeys";
import { useWebhooks } from "./useWebhooks";
import { useMembers } from "./useMembers";
import { useInvitations } from "./useInvitations";
import { useAuditLogs } from "./useAuditLogs";

/**
 * The current value of every settings pane, for the navigation.
 *
 * The settings nav lists eight panes; a list of eight nouns is a table of contents, and answers
 * nothing. What a person actually arrives at this page asking is *what is this set to* — and on the
 * old single-column page the only way to find out was to scroll two thousand pixels past every
 * other concern. Reading each pane's live state into the nav answers most of those questions
 * without opening anything.
 *
 * Every query here is already issued by the pane that owns it. TanStack Query dedupes on the key,
 * so asking for them again costs one cache read each rather than a second request.
 */

export type SettingsPaneId =
  | "general"
  | "billing"
  | "brand"
  | "connections"
  | "schedule"
  | "developer"
  | "team"
  | "activity";

export interface PaneStatus {
  /** One short line of live state. Empty string while it is still loading. */
  label: string;
  /** A colour to show beside the label — only Brand has one, and it is the accent itself. */
  swatch?: string;
  /** True when the plan does not include this pane, so the nav can say so before it is opened. */
  locked?: boolean;
}

const CONNECTABLE = 3;
const HOUR = 60 * 60 * 1000;

function cadenceWord(ms: number): string {
  if (ms === HOUR) return "Hourly";
  if (ms === 24 * HOUR) return "Daily";
  if (ms === 7 * 24 * HOUR) return "Weekly";
  return `Every ${Math.round(ms / HOUR)}h`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Capitalises the first letter only.
 *
 * The rail used CSS `capitalize` to title-case the two values that arrive lowercased from the API
 * (`starter`, `professional`), which also title-cased every other word on every other line —
 * "Name, URL And Plan", "1 Of 3 Connected". Casing a value is the value's own business.
 */
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

export function useSettingsOverview(
  workspaceId: string | null,
  isAdmin: boolean,
): Record<SettingsPaneId, PaneStatus> {
  const { data: subscription } = useSubscription(workspaceId);
  const { data: branding } = useBranding(isAdmin ? workspaceId : null);
  const { data: guidelines } = useBrandGuidelines(isAdmin ? workspaceId : null);
  const { data: connections } = useConnections(workspaceId);
  const { data: automation } = useAutomation(isAdmin ? workspaceId : null);
  // Admin-gated on the API, and neither hook falls back to a mock — asking as a viewer would only
  // buy a guaranteed 403.
  const { data: apiKeys } = useApiKeys(isAdmin ? workspaceId : null);
  const { data: webhooks } = useWebhooks(isAdmin ? workspaceId : null);
  const { data: members } = useMembers(workspaceId);
  const { data: invitations } = useInvitations(isAdmin ? workspaceId : null);
  const { data: logs } = useAuditLogs(isAdmin ? workspaceId : null);

  const sub = subscription?.data;
  const plan = (sub?.plan ?? null) as Plan | null;
  // The plan is known on the client, so a pane the plan does not include can say so up front
  // instead of letting someone fill in a form and collect a server error for it.
  const apiUnlocked = plan ? PLAN_LIMITS[plan].apiAccess : true;

  return useMemo(() => {
    const connected = (connections?.data ?? []).filter((c) => c.isActive).length;
    const keyCount = (apiKeys?.data ?? []).filter((k) => !k.revokedAt).length;
    const hookCount = webhooks?.data?.length ?? 0;
    const memberCount = members?.data?.length ?? 0;
    const inviteCount = invitations?.data?.length ?? 0;
    const logCount = logs?.data.data.length ?? 0;

    return {
      general: { label: workspaceId ? "Name, URL and plan" : "" },

      billing: {
        label: sub ? `${cap(sub.plan)} · ${sub.status.replace("_", " ")}` : "",
      },

      brand: {
        label: guidelines ? `${cap(guidelines.data.tone)} tone` : "",
        ...(branding?.data.primaryColor ? { swatch: branding.data.primaryColor } : {}),
      },

      connections: {
        label: connections
          ? connected === 0
            ? "None connected"
            : `${connected} of ${CONNECTABLE} connected`
          : "",
      },

      schedule: {
        label: automation
          ? automation.data.enabled
            ? cadenceWord(automation.data.cadenceMs)
            : "Paused"
          : "",
      },

      developer: apiUnlocked
        ? {
            label:
              apiKeys || webhooks
                ? keyCount + hookCount === 0
                  ? "Nothing set up"
                  : `${plural(keyCount, "key")} · ${plural(hookCount, "endpoint")}`
                : "",
          }
        : { label: "Scale plan", locked: true },

      team: {
        label: members
          ? inviteCount > 0
            ? `${plural(memberCount, "member")} · ${plural(inviteCount, "invite")}`
            : plural(memberCount, "member")
          : "",
      },

      activity: {
        label: logs ? (logCount === 0 ? "Nothing yet" : `${plural(logCount, "event")}`) : "",
      },
    };
  }, [
    workspaceId,
    sub,
    branding,
    guidelines,
    connections,
    automation,
    apiKeys,
    webhooks,
    members,
    invitations,
    logs,
    apiUnlocked,
  ]);
}
