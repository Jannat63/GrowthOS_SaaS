"use client";
import { useEffect, useState } from "react";
import type {
  AdminWorkspaceFilter,
  AdminWorkspaceSort,
  AdminWorkspaceSummary,
} from "@growthos/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@growthos/ui/components/table";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { DIRECTORY_PAGE_SIZE, useAdminWorkspaces } from "@/lib/hooks/useAdmin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { AdminSearch } from "@/components/admin/AdminSearch";
import {
  FilterChips,
  LinkedRow,
  Pager,
  RowLink,
  SortSelect,
  type FilterOption,
} from "@/components/admin/Directory";
import { countLabel, planLabel, subscriptionStatusLabel } from "@/components/admin/labels";
import { subscriptionTone, toneTextClass, trialTone, type Tone } from "@/components/admin/tone";
import { absoluteTime, daysUntil, relativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

/**
 * Every account on the platform.
 *
 * The previous version rendered the first fifty rows, sorted one way, with no filters and no
 * second page — and made only the name clickable. This is the same data as a directory you can
 * actually work: narrow it to the question you have, order it, walk it, and open a row by clicking
 * anywhere on it.
 *
 * Plan and status share one column. They used to be two, which meant every row printed a gold
 * "Trialing" badge — and since nearly every workspace is trialing, the whole column was gold and
 * gold stopped meaning anything. Status now appears only when it is not the ordinary case.
 */

const FILTERS: FilterOption<AdminWorkspaceFilter>[] = [
  { value: "past_due", label: "Payment failed" },
  { value: "trial_ending", label: "Trial ending" },
  { value: "no_connections", label: "Nothing connected" },
  { value: "cancelling", label: "Cancelling" },
];

const SORTS: FilterOption<AdminWorkspaceSort>[] = [
  { value: "created", label: "Newest first" },
  { value: "name", label: "Name, A–Z" },
  { value: "members", label: "Most people" },
  { value: "activity", label: "Recently active" },
];

export default function AdminWorkspacesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminWorkspaceFilter | undefined>(undefined);
  const [sort, setSort] = useState<AdminWorkspaceSort>("created");
  const [offset, setOffset] = useState(0);
  const debounced = useDebouncedValue(search);

  // Any change to what is being asked for invalidates where you are in the answer. Without this,
  // filtering while on page three shows an empty table and looks like "no results".
  useEffect(() => setOffset(0), [debounced, filter, sort]);

  const { data, isLoading } = useAdminWorkspaces({
    search: debounced,
    filter,
    sort,
    offset,
    limit: DIRECTORY_PAGE_SIZE,
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="font-display text-xl font-semibold tracking-tight">Workspaces</h1>
        {data && (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {countLabel(data.total, "workspace")}
            {filter ? " matching" : ""}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <AdminSearch
            value={search}
            onChange={setSearch}
            placeholder="Search by name"
            label="Search workspaces"
          />
        </div>
        <SortSelect options={SORTS} value={sort} onChange={setSort} label="Sort workspaces" />
      </div>

      <FilterChips
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        label="Filter workspaces"
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">People</TableHead>
              <TableHead className="text-right">Connected</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Customer since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-24 w-full" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {debounced
                    ? `No workspace matches “${debounced}”.`
                    : filter
                      ? "No workspace is in that state right now."
                      : "No workspaces yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((ws) => <WorkspaceRow key={ws.id} ws={ws} />)
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

function WorkspaceRow({ ws }: { ws: AdminWorkspaceSummary }) {
  const trialDays = ws.subscriptionStatus === "trialing" ? daysUntil(ws.trialEndsAt) : null;

  // The row's tone is the worse of its two problems: a failed payment outranks a lapsing trial.
  const statusTone = subscriptionTone(ws.subscriptionStatus);
  const tone: Tone = statusTone !== "neutral" ? statusTone : trialTone(trialDays);

  // Only say something about status when it is not the ordinary case. "Trialing" on a trial with
  // three weeks left is a column full of noise.
  const note =
    ws.subscriptionStatus === "past_due"
      ? "Payment failed"
      : ws.subscriptionStatus === "canceled"
        ? "Canceled"
        : trialDays !== null && trialDays < 0
          ? "Trial lapsed"
          : trialDays !== null && trialDays <= 3
            ? `Trial ends ${relativeTime(ws.trialEndsAt)}`
            : null;

  return (
    <LinkedRow tone={tone}>
      <TableCell className="font-medium">
        <RowLink href={`/admin/workspaces/${ws.id}`}>{ws.name}</RowLink>
      </TableCell>
      <TableCell>
        <span className="font-mono text-xs">{planLabel(ws.plan)}</span>
        {note && (
          <span className={cn("ml-2 text-xs", toneTextClass(tone))}>{note}</span>
        )}
        {!note && ws.subscriptionStatus !== "trialing" && ws.subscriptionStatus !== "active" && (
          <span className="ml-2 text-xs text-muted-foreground">
            {subscriptionStatusLabel(ws.subscriptionStatus)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">{ws.memberCount}</TableCell>
      <TableCell
        className={cn(
          "text-right font-mono text-xs tabular-nums",
          // Zero connected platforms is the reason a workspace shows no data at all, so it is worth
          // marking — but quietly, as muted text, not as a warning colour on every new account.
          ws.connectedPlatformCount === 0 && "text-muted-foreground"
        )}
      >
        {ws.connectedPlatformCount}
      </TableCell>
      <TableCell
        className="whitespace-nowrap font-mono text-xs text-muted-foreground"
        title={absoluteTime(ws.lastActivityAt)}
      >
        {ws.lastActivityAt ? relativeTime(ws.lastActivityAt) : "never"}
      </TableCell>
      <TableCell
        className="whitespace-nowrap font-mono text-xs text-muted-foreground"
        title={absoluteTime(ws.createdAt)}
      >
        {relativeTime(ws.createdAt)}
      </TableCell>
    </LinkedRow>
  );
}
