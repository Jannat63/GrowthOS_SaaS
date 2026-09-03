"use client";
import Link from "next/link";
import type { AdminAuditLogEntry } from "@growthos/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@growthos/ui/components/table";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { cn } from "@/lib/utils/cn";
import { useAdminAuditLog } from "@/lib/hooks/useAdmin";
import { planLabel } from "@/components/admin/labels";

/**
 * Readable name and consequence for each recorded action. `mutating` is what separates the two
 * entries that changed a customer's account from the hundreds that merely looked at one — in a log
 * where reads vastly outnumber writes, an undifferentiated list buries the only rows anyone is
 * ever actually looking for.
 *
 * Keys match the `action` strings passed to logAdminAction in apps/api/src/routes/admin.ts.
 */
const ACTIONS: Record<string, { label: string; mutating?: boolean }> = {
  "workspace.list": { label: "Browsed workspaces" },
  "workspace.view": { label: "Opened a workspace" },
  "workspace.plan_override": { label: "Changed a plan", mutating: true },
  "user.list": { label: "Browsed people" },
  "health.view": { label: "Viewed the overview" },
};

type OverrideMeta = { reason?: string; before?: string | null; after?: string | null };
type SearchMeta = { search?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * What the entry actually says, per action.
 *
 * This column used to be `JSON.stringify(metadata)` inside a `max-w-xs truncate`, which meant the
 * reason attached to a plan override — the single most important thing the audit log records, and
 * the only field the API forces an admin to write — was clipped to about six words of `{"reason":"`
 * before it ever got to the point.
 */
function Detail({ entry }: { entry: AdminAuditLogEntry }) {
  const meta = isRecord(entry.metadata) ? entry.metadata : null;

  if (entry.action === "workspace.plan_override") {
    const m = (meta ?? {}) as OverrideMeta;
    return (
      <div className="space-y-1">
        {m.before && m.after && (
          <p className="font-mono text-xs text-muted-foreground">
            {planLabel(m.before)} → {planLabel(m.after)}
          </p>
        )}
        {m.reason ? (
          <p className="text-sm leading-relaxed">{m.reason}</p>
        ) : (
          <p className="text-sm text-warning">No reason recorded.</p>
        )}
      </div>
    );
  }

  if (entry.action === "workspace.list" || entry.action === "user.list") {
    const term = (meta as SearchMeta | null)?.search;
    return term ? (
      <p className="text-sm text-muted-foreground">
        Searched <span className="text-foreground">{term}</span>
      </p>
    ) : (
      <p className="text-sm text-muted-foreground">Full list</p>
    );
  }

  // An unmapped action still has to show whatever it recorded, rather than nothing.
  if (meta && Object.keys(meta).length > 0) {
    return (
      <p className="break-words font-mono text-xs text-muted-foreground">{JSON.stringify(meta)}</p>
    );
  }
  return <span className="text-muted-foreground/60">—</span>;
}

function Target({ entry }: { entry: AdminAuditLogEntry }) {
  if (entry.targetId === "all") {
    return <span className="text-muted-foreground">Platform-wide</span>;
  }
  // A workspace id in a log is only useful if it takes you to the workspace.
  if (entry.targetType === "workspace") {
    return (
      <Link
        href={`/admin/workspaces/${entry.targetId}`}
        className="rounded-sm font-mono text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {entry.targetId.slice(0, 8)}
      </Link>
    );
  }
  return <span className="font-mono text-xs text-muted-foreground">{entry.targetId.slice(0, 8)}</span>;
}

export default function AdminAuditLogPage() {
  const { data, isLoading } = useAdminAuditLog();
  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every admin action against a customer account, including plain views. Reads are recorded
          as well as changes, so &ldquo;who looked at this, and why&rdquo; stays answerable.
          Super&nbsp;admins only.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Account</TableHead>
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
                  Nothing recorded yet. The first admin action writes the first row.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((entry) => {
                const action = ACTIONS[entry.action];
                return (
                  <TableRow key={entry.id} className="align-top">
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.actorName ?? entry.actorEmail ?? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.actorUserId.slice(0, 8)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm",
                          action?.mutating ? "font-medium text-warning" : "text-foreground"
                        )}
                      >
                        {action?.label ?? entry.action}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <Target entry={entry} />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <Detail entry={entry} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
