"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@growthos/ui/components/table";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useAdminWorkspaces } from "@/lib/hooks/useAdmin";

export default function AdminWorkspacesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminWorkspaces(search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {data ? `${data.total} total` : "Loading…"} — every customer workspace on the platform.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="h-9 w-full rounded-md border border-neutral-800 bg-neutral-900 pl-9 pr-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="text-neutral-500">Name</TableHead>
              <TableHead className="text-neutral-500">Plan</TableHead>
              <TableHead className="text-neutral-500">Status</TableHead>
              <TableHead className="text-neutral-500">Members</TableHead>
              <TableHead className="text-neutral-500">Connections</TableHead>
              <TableHead className="text-neutral-500">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-neutral-800">
                <TableCell colSpan={6}>
                  <Skeleton className="h-24 w-full bg-neutral-800" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow className="border-neutral-800">
                <TableCell colSpan={6} className="py-8 text-center text-sm text-neutral-500">
                  No workspaces match "{search}".
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((ws) => (
                <TableRow key={ws.id} className="border-neutral-800 hover:bg-neutral-900">
                  <TableCell>
                    <Link href={`/admin/workspaces/${ws.id}`} className="font-medium text-neutral-100 hover:underline">
                      {ws.name}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize text-neutral-300">{ws.plan}</TableCell>
                  <TableCell>
                    <Badge variant={ws.subscriptionStatus === "active" ? "success" : "muted"}>
                      {ws.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-300">{ws.memberCount}</TableCell>
                  <TableCell className="text-neutral-300">{ws.connectedPlatformCount}</TableCell>
                  <TableCell className="text-neutral-500">{new Date(ws.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
