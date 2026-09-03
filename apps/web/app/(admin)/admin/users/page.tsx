"use client";
import { useEffect, useState } from "react";
import type { AdminUserFilter, AdminUserSort, AdminUserSummary } from "@growthos/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@growthos/ui/components/table";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { DIRECTORY_PAGE_SIZE, useAdminUsers } from "@/lib/hooks/useAdmin";
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
import { countLabel, platformRoleLabel } from "@/components/admin/labels";
import { absoluteTime, relativeTime } from "@/lib/utils/time";

/**
 * Everyone with a GrowthOS account.
 *
 * Two filters, because they are the two questions this page gets asked. "Platform staff" is the
 * standing security question — who has elevated access, answered in one click rather than by
 * scanning a column of dashes. "No workspace" finds the people who signed up and stopped, which is
 * both a support queue and, on a development database, where the seeded test accounts collect.
 */

const FILTERS: FilterOption<AdminUserFilter>[] = [
  { value: "staff", label: "Platform staff" },
  { value: "no_workspace", label: "No workspace" },
];

const SORTS: FilterOption<AdminUserSort>[] = [
  { value: "created", label: "Newest first" },
  { value: "name", label: "Name, A–Z" },
  { value: "last_seen", label: "Recently seen" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminUserFilter | undefined>(undefined);
  const [sort, setSort] = useState<AdminUserSort>("created");
  const [offset, setOffset] = useState(0);
  const debounced = useDebouncedValue(search);

  useEffect(() => setOffset(0), [debounced, filter, sort]);

  const { data, isLoading } = useAdminUsers({
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
        <h1 className="font-display text-xl font-semibold tracking-tight">People</h1>
        {data && (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {countLabel(data.total, "person", "people")}
            {filter ? " matching" : ""}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <AdminSearch
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email"
            label="Search people"
          />
        </div>
        <SortSelect options={SORTS} value={sort} onChange={setSort} label="Sort people" />
      </div>

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filter people" />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Access</TableHead>
              <TableHead className="text-right">Workspaces</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Joined</TableHead>
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
                    ? `Nobody matches “${debounced}”.`
                    : filter === "staff"
                      ? "Nobody holds a platform role."
                      : filter
                        ? "Everybody belongs to a workspace."
                        : "No accounts yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => <PersonRow key={u.id} user={u} />)
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

function PersonRow({ user }: { user: AdminUserSummary }) {
  return (
    // Holding a platform role is not a fault, so it is not gold — but it is the one thing on this
    // page worth spotting from the edge, so it earns the spine.
    <LinkedRow tone={user.platformRole ? "attention" : "neutral"}>
      <TableCell className="font-medium">
        <RowLink href={`/admin/users/${user.id}`}>{user.name || "No name set"}</RowLink>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        {user.platformRole ? (
          <Badge variant="warning">{platformRoleLabel(user.platformRole)}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Customer</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {user.workspaceCount}
      </TableCell>
      <TableCell
        className="whitespace-nowrap font-mono text-xs text-muted-foreground"
        title={absoluteTime(user.lastSeenAt)}
      >
        {/* Sessions are deleted on expiry, so no session means "not lately", not "never". */}
        {user.lastSeenAt ? relativeTime(user.lastSeenAt) : "not lately"}
      </TableCell>
      <TableCell
        className="whitespace-nowrap font-mono text-xs text-muted-foreground"
        title={absoluteTime(user.createdAt)}
      >
        {relativeTime(user.createdAt)}
      </TableCell>
    </LinkedRow>
  );
}
