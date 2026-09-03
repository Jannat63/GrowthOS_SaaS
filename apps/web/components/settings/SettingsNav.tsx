"use client";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PaneStatus, SettingsPaneId } from "@/lib/hooks/useSettingsOverview";
import { SETTINGS_GROUPS, type SettingsPane } from "./sections";

/**
 * The settings rail — a status board rather than a table of contents.
 *
 * A list of eight nouns tells you where things are and nothing about them. Each item here carries
 * its pane's live value on a second line, so "what is the accent set to", "which plan am I on",
 * "how often does it refresh", "is anything connected" are all answered without opening anything.
 * That is the whole reason this nav is worth more than the anchor list it replaces.
 *
 * Deliberately a `<nav>` of buttons and not shadcn `Tabs`, despite D6. A `role="tablist"` may only
 * contain tabs, and this list is grouped under three headings; the alternatives were to drop the
 * headings or to declare three tablists driving one panel set, both of which describe the page less
 * accurately to a screen reader than grouped navigation does. `aria-current` carries the selection.
 */
export function SettingsNav({
  active,
  onSelect,
  status,
  isAdmin,
}: {
  active: SettingsPaneId;
  onSelect: (id: SettingsPaneId) => void;
  status: Record<SettingsPaneId, PaneStatus>;
  isAdmin: boolean;
}) {
  const groups = SETTINGS_GROUPS.map((g) => ({
    ...g,
    panes: g.panes.filter((p) => isAdmin || !p.adminOnly),
  })).filter((g) => g.panes.length > 0);

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-6">
      {/* Below `lg` the rail becomes a single scrolling row. The status lines are dropped there —
          at that width they would either wrap or truncate, and a truncated status is a lie. */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 lg:mx-0 lg:block lg:space-y-6 lg:overflow-visible lg:px-0 lg:pb-0">
        {groups.map((group, i) => (
          <div key={group.label} className="contents lg:block">
            {/* The group headings are the only thing marking the boundaries, and they are hidden in
                the horizontal layout — so below `lg` a hairline stands in for them, rather than
                letting eight chips run together as one undifferentiated strip. */}
            {i > 0 && (
              <span className="mx-1 w-px shrink-0 self-stretch bg-border lg:hidden" aria-hidden />
            )}
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground lg:block">
              {group.label}
            </p>
            <ul className="contents lg:mt-2 lg:block lg:space-y-0.5">
              {group.panes.map((pane) => (
                <li key={pane.id} className="shrink-0 lg:block">
                  <NavItem
                    pane={pane}
                    status={status[pane.id]}
                    active={pane.id === active}
                    onSelect={() => onSelect(pane.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  pane,
  status,
  active,
  onSelect,
}: {
  pane: SettingsPane;
  status: PaneStatus;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = pane.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-full whitespace-nowrap rounded-lg border px-3 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "lg:whitespace-normal",
        active
          ? "border-primary/30 bg-primary/[0.06]"
          : "border-transparent hover:border-border hover:bg-primary/10",
      )}
    >
      <span className="flex items-center gap-2">
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")}
        />
        <span className={cn("text-sm", active ? "font-medium text-foreground" : "text-foreground")}>
          {pane.label}
        </span>
        {status.locked && (
          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Not on your plan" />
        )}
      </span>

      {/* Reserves its line whether or not the value has loaded, so the rail does not jolt as each
          query lands. */}
      <span className="hidden min-h-[15px] items-center gap-1.5 pl-[22px] lg:flex">
        {status.swatch && (
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-foreground/20"
            style={{ background: status.swatch }}
            aria-hidden
          />
        )}
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          {status.label}
        </span>
      </span>
    </button>
  );
}
