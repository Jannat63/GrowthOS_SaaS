"use client";
import { useState } from "react";
import Link from "next/link";
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
import { useAdminWorkspaces } from "@/lib/hooks/useAdmin";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { planLabel, subscriptionStatusLabel, subscriptionTone } from "@/components/admin/labels";

export default function AdminWorkspacesPage() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const { data, isLoading } = useAdminWorkspaces(debounced);

  const rows = data?.data ?? [];
  // `total` is the count matching the query, `rows.length` is what the API actually returned. They
  // differ once the result set is capped, and the old header only ever showed `total` — so a
  // truncated list looked complete.
  const truncated = data ? data.total > rows.length : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {!data
            ? "Every customer workspace on the platform."
            : truncated
              ? `Showing ${rows.length} of ${data.total} workspaces.`
              : `${data.total} ${data.total === 1 ? "workspace" : "workspaces"}.`}
        </p>
      </div>

      <AdminSearch
        value={search}
        onChange={setSearch}
        placeholder="Search by name"
        label="Search workspaces"
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Connections</TableHead>
              <TableHead>Created</TableHead>
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
                    : "No workspaces on the platform yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell>
                    <Link
                      href={`/admin/workspaces/${ws.id}`}
                      className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {ws.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{planLabel(ws.plan)}</TableCell>
                  <TableCell>
                    <Badge variant={subscriptionTone(ws.subscriptionStatus)}>
                      {subscriptionStatusLabel(ws.subscriptionStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {ws.memberCount}
                  </TableCell>
                  {/* Zero connections is the whole reason a workspace shows no data, so it is
                      called out rather than printed as a quiet 0 among other quiet numbers. */}
                  <TableCell className="text-right font-mono tabular-nums">
                    {ws.connectedPlatformCount === 0 ? (
                      <span className="text-warning">0</span>
                    ) : (
                      ws.connectedPlatformCount
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(ws.createdAt).toLocaleDateString()}
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
