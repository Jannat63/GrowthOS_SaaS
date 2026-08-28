import {
  Activity,
  Building2,
  CreditCard,
  Palette,
  Plug,
  Terminal,
  Timer,
  Users,
} from "lucide-react";
import type { SettingsPaneId } from "@/lib/hooks/useSettingsOverview";

/**
 * The settings panes, grouped.
 *
 * Ten sections used to sit in one column roughly two thousand pixels tall, in an order nobody could
 * predict: changing an accent colour meant scrolling past three pricing cards, and inviting a
 * teammate meant scrolling past API keys, webhooks and a ten-row scheduler log. Worse, `/settings`
 * was a single URL for all of it, so no one could be sent to a particular setting.
 *
 * Two sections were merged on the way, because each pair was one subject split in half:
 *  - **Brand** = branding (name, logo, accent) + brand guidelines (tone, banned terms). Both answer
 *    "what does our brand look and sound like", and the guidelines were already placed immediately
 *    after branding for exactly that reason.
 *  - **Developer** = API keys + webhooks. The pull and push halves of the same integration surface,
 *    behind the same plan gate and the same admin gate.
 *
 * The groups encode something true rather than decorating the list: **Workspace** is who you are and
 * what you pay, **Data & output** is what the product does with your account, and **Advanced** is
 * what most workspaces never open.
 */

export interface SettingsPane {
  id: SettingsPaneId;
  label: string;
  icon: typeof Building2;
  /** Hidden entirely for non-admins, matching the API's own guard on the underlying routes. */
  adminOnly: boolean;
}

export interface SettingsGroup {
  label: string;
  panes: SettingsPane[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: "Workspace",
    panes: [
      { id: "general", label: "General", icon: Building2, adminOnly: false },
      { id: "billing", label: "Plan & usage", icon: CreditCard, adminOnly: false },
      { id: "team", label: "Team", icon: Users, adminOnly: false },
    ],
  },
  {
    label: "Data & output",
    panes: [
      { id: "connections", label: "Connections", icon: Plug, adminOnly: false },
      // Renamed from "Automation". There is a whole Automation *module* in the sidebar about
      // standing orders and an approval queue; this is the intelligence-report refresh loop and its
      // alerts, which is a different thing entirely. Two unrelated features under one word in one
      // product is a naming collision, not a coincidence a reader will resolve.
      { id: "schedule", label: "Scheduled refresh", icon: Timer, adminOnly: true },
      { id: "brand", label: "Brand", icon: Palette, adminOnly: true },
    ],
  },
  {
    label: "Advanced",
    panes: [
      { id: "developer", label: "Developer", icon: Terminal, adminOnly: true },
      { id: "activity", label: "Activity log", icon: Activity, adminOnly: true },
    ],
  },
];

export const ALL_PANES: SettingsPane[] = SETTINGS_GROUPS.flatMap((g) => g.panes);

export function panesFor(isAdmin: boolean): SettingsPane[] {
  return ALL_PANES.filter((p) => isAdmin || !p.adminOnly);
}

/** Resolves `?tab=` to a pane this member may actually open, falling back to the first one. */
export function resolvePane(value: string | null, isAdmin: boolean): SettingsPaneId {
  const allowed = panesFor(isAdmin);
  return allowed.find((p) => p.id === value)?.id ?? allowed[0]!.id;
}
