"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LayoutGrid, ScrollText, User, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@growthos/ui/components/command";
import { useAdminUsers, useAdminWorkspaces } from "@/lib/hooks/useAdmin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { planLabel } from "@/components/admin/labels";

/**
 * The console's primary navigation.
 *
 * A sidebar answers "what sections exist", which an operator learns once and then never needs
 * again. The question they actually have, every time, is "where is this account" — so the fastest
 * path between a customer's name in a support thread and their file in the console is a text
 * field, and that is what this is. The rail beside it exists for the handful of destinations that
 * are not an account.
 *
 * Server-side search, not cmdk's built-in filter: the directory lives in Postgres and only the
 * first page of it is ever in the browser, so filtering what happens to be loaded would quietly
 * hide most of the platform. `shouldFilter` is off and the static destinations are matched here
 * instead.
 */

const DESTINATIONS = [
  { href: "/admin", label: "Overview", keywords: "home queue attention", icon: LayoutGrid },
  { href: "/admin/workspaces", label: "Workspaces", keywords: "accounts customers", icon: Building2 },
  { href: "/admin/users", label: "People", keywords: "users accounts staff", icon: Users },
  {
    href: "/admin/audit-log",
    label: "Audit log",
    keywords: "record history who looked",
    icon: ScrollText,
    superAdminOnly: true,
  },
];

export function AdminCommandPalette({
  open,
  onOpenChange,
  isSuperAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query);

  // Only ask the server once there is something to look for. An empty palette showing the first
  // fifty of everything is noise, and it would write an audit row every time the palette opened.
  const searching = search.trim().length > 0;
  // Six of each is what fits above the fold without scrolling; the palette is for jumping to a
  // known account, and anyone browsing wants the directory instead.
  const { data: workspaces } = useAdminWorkspaces({ search, limit: 6, enabled: searching });
  const { data: people } = useAdminUsers({ search, limit: 6, enabled: searching });

  // Clear on close so reopening starts fresh rather than on a stale result set.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const destinations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DESTINATIONS.filter((d) => !d.superAdminOnly || isSuperAdmin).filter(
      (d) => !q || d.label.toLowerCase().includes(q) || d.keywords.includes(q)
    );
  }, [query, isSuperAdmin]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const workspaceHits = workspaces?.data ?? [];
  const peopleHits = people?.data ?? [];
  const nothingFound =
    searching && destinations.length === 0 && workspaceHits.length === 0 && peopleHits.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Find an account or a person">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Find an account, a person, an id…"
      />
      <CommandList>
        {nothingFound && <CommandEmpty>Nothing matches “{search}”.</CommandEmpty>}

        {destinations.length > 0 && (
          <CommandGroup heading="Go to">
            {destinations.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} value={href} onSelect={() => go(href)}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {workspaceHits.length > 0 && (
          <CommandGroup heading="Workspaces">
            {workspaceHits.map((ws) => (
              <CommandItem
                key={ws.id}
                value={ws.id}
                onSelect={() => go(`/admin/workspaces/${ws.id}`)}
              >
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{ws.name}</span>
                <CommandShortcut>{planLabel(ws.plan)}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {peopleHits.length > 0 && (
          <CommandGroup heading="People">
            {peopleHits.map((u) => (
              <CommandItem key={u.id} value={u.id} onSelect={() => go(`/admin/users/${u.id}`)}>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{u.name || u.email}</span>
                <CommandShortcut className="truncate">{u.email}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Cmd/Ctrl-K anywhere in the console, and `/` when the operator is not already typing into
 * something. Returns the open state so the header's search button can share it — one palette, two
 * ways in.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !isTypingInto(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return { open, setOpen };
}

function isTypingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
