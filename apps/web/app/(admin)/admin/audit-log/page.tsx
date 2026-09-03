"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@growthos/ui/components/table";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { DIRECTORY_PAGE_SIZE, useAdminAuditLog } from "@/lib/hooks/useAdmin";
import { FilterChips, Pager, type FilterOption } from "@/components/admin/Directory";
import { AuditDetail, AuditTarget, auditActionLabel, isMutatingAction } from "@/components/admin/audit";
import { absoluteTime, relativeTime } from "@/lib/utils/time";
import { countLabel } from "@/components/admin/labels";
import { cn } from "@/lib/utils/cn";

/**
 * The record of what platform staff have done.
 *
 * **It opens on changes, not on views.** Every admin route records a row, including the list and
 * overview pages, so views outnumber changes heavily — the first version of this page was nine
 * consecutive entries reading "Browsed people" and "Viewed the overview", with the one plan
 * override that mattered nowhere in sight. Reads are still recorded and are one chip away. The
 * record being complete and the default view being useful are different requirements, and this is
 * the only page where they pull against each other.
 *
 * Repeated reads collapse server-side into one row with a count, so a tab left open no longer
 * writes a line a minute.
 */

type Scope = "workspace" | "user";

const SCOPES: FilterOption<Scope>[] = [
  { value: "workspace", label: "Accounts" },
  { value: "user", label: "People" },
];

export default function AdminAuditLogPage() {
  const [mutatingOnly, setMutatingOnly] = useState(true);
  const [targetType, setTargetType] = useState<Scope | undefined>(undefined);
  const [offset, setOffset] = useState(0);

  useEffect(() => setOffset(0), [mutatingOnly, targetType]);

  const { data, isLoading } = useAdminAuditLog({
    mutatingOnly,
    targetType,
    offset,
    limit: DIRECTORY_PAGE_SIZE,
  });
  const rows = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="font-display text-xl font-semibold tracking-tight">Audit log</h1>
        {data && (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {countLabel(data.total, "entry", "entries")}
          </p>
        )}
      </div>

      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Everything platform staff do against a customer account, including the pages they only look
        at. Recording views as well as changes is what keeps &ldquo;who looked at this, and
        why&rdquo; answerable. Super admins only.
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="group" aria-label="What to show" className="flex gap-1.5">
          <Toggle active={mutatingOnly} onClick={() => setMutatingOnly(true)}>
            Changes only
          </Toggle>
          <Toggle active={!mutatingOnly} onClick={() => setMutatingOnly(false)}>
            Everything, views included
          </Toggle>
        </div>

        <FilterChips
          options={SCOPES}
          value={targetType}
          onChange={setTargetType}
          label="Filter by what was touched"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Did what</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-24 w-full" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {mutatingOnly
                    ? "Nothing has been changed. Switch to “Everything” to see what has been looked at."
                    : "Nothing recorded yet. The first admin action writes the first row."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((entry) => {
                const mutating = isMutatingAction(entry.action);
                return (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      "border-l-2 align-top",
                      // A change is the thing worth finding in a page of views, so it gets the
                      // spine — gold for "not the ordinary case", the same meaning it carries
                      // everywhere else in the console.
                      mutating ? "border-l-warning" : "border-l-transparent"
                    )}
                  >
                    <TableCell
                      className="whitespace-nowrap font-mono text-xs text-muted-foreground"
                      title={absoluteTime(entry.createdAt)}
                    >
                      {relativeTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.actorName ?? entry.actorEmail ?? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.actorUserId.slice(0, 8)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm", mutating && "font-medium text-warning")}>
                        {auditActionLabel(entry.action)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <AuditTarget entry={entry} />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <AuditDetail action={entry.action} metadata={entry.metadata} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Pager
        offset={offset}
        limit={DIRECTORY_PAGE_SIZE}
        total={data?.total ?? 0}
        onOffsetChange={setOffset}
      />
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
