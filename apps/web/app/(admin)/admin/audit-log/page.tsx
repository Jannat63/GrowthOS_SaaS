"use client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@growthos/ui/components/table";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useAdminAuditLog } from "@/lib/hooks/useAdmin";

export default function AdminAuditLogPage() {
  const { data, isLoading } = useAdminAuditLog();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Every admin action against a customer's workspace or account, including plain views —
          not just changes. Super Admin only.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-800 hover:bg-transparent">
              <TableHead className="text-neutral-500">When</TableHead>
              <TableHead className="text-neutral-500">Actor</TableHead>
              <TableHead className="text-neutral-500">Action</TableHead>
              <TableHead className="text-neutral-500">Target</TableHead>
              <TableHead className="text-neutral-500">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-neutral-800">
                <TableCell colSpan={5}>
                  <Skeleton className="h-24 w-full bg-neutral-800" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow className="border-neutral-800">
                <TableCell colSpan={5} className="py-8 text-center text-sm text-neutral-500">
                  No admin actions logged yet.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((entry) => (
                <TableRow key={entry.id} className="border-neutral-800 hover:bg-neutral-900 align-top">
                  <TableCell className="whitespace-nowrap text-xs text-neutral-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-200">
                    {entry.actorName ?? entry.actorEmail ?? entry.actorUserId}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-amber-400">{entry.action}</TableCell>
                  <TableCell className="text-xs text-neutral-400">
                    {entry.targetType}:{entry.targetId}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-neutral-500">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
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
