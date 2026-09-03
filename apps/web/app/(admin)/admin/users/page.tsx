"use client";
import { useState } from "react";
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
import { useAdminUsers } from "@/lib/hooks/useAdmin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { platformRoleLabel } from "@/components/admin/labels";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const { data, isLoading } = useAdminUsers(debounced);

  const rows = data?.data ?? [];
  const truncated = data ? data.total > rows.length : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">People</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {!data
            ? "Everyone with a GrowthOS account."
            : truncated
              ? `Showing ${rows.length} of ${data.total} people.`
              : `${data.total} ${data.total === 1 ? "person" : "people"}.`}
        </p>
      </div>

      <AdminSearch
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email"
        label="Search people"
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Platform role</TableHead>
              <TableHead className="text-right">Workspaces</TableHead>
              <TableHead>Joined</TableHead>
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
                  {debounced ? `Nobody matches “${debounced}”.` : "No accounts yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {/* Platform staff are the rows that matter on this page — everyone else is a
                        customer with no elevated access, which is the unremarkable case. */}
                    {u.platformRole ? (
                      <Badge variant="warning">{platformRoleLabel(u.platformRole)}</Badge>
                    ) : (
                      <span className="text-muted-foreground/60" aria-label="No platform role">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {u.workspaceCount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
