"use client";
import {
  Activity,
  CheckCircle2,
  Link2,
  Link2Off,
  MessageSquare,
  RefreshCw,
  UserCheck,
  UserMinus,
} from "lucide-react";
import type { AuditLogEntry } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useAuditLogs } from "@/lib/hooks/useAuditLogs";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

// Maps an audit action to an icon + a human sentence fragment (the actor name is prepended).
const ACTION_META: Record<string, { icon: typeof Activity; verb: string }> = {
  "recommendation.status_changed": { icon: CheckCircle2, verb: "updated a recommendation" },
  "recommendation.assigned": { icon: UserCheck, verb: "assigned a recommendation" },
  "recommendation.unassigned": { icon: UserMinus, verb: "unassigned a recommendation" },
  "recommendation.commented": { icon: MessageSquare, verb: "commented on a recommendation" },
  "connection.connected": { icon: Link2, verb: "connected an integration" },
  "connection.disconnected": { icon: Link2Off, verb: "disconnected an integration" },
  "connection.synced": { icon: RefreshCw, verb: "synced an integration" },
};

function describe(entry: AuditLogEntry): string {
  const meta = ACTION_META[entry.action];
  const verb = meta?.verb ?? entry.action.replace(/[._]/g, " ");
  const status = entry.metadata?.status as string | undefined;
  const platform = entry.metadata?.platform as string | undefined;
  const detail = status ? ` → ${status}` : platform ? ` (${platform})` : "";
  return `${verb}${detail}`;
}

export function ActivitySection({ workspaceId }: { workspaceId: string | null }) {
  const { data: logs } = useAuditLogs(workspaceId);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Activity log</h2>
        {logs && <DataSourceBadge source={logs.source} />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        A record of who did what across this workspace.
      </p>

      <div className="mt-4">
        {!logs ? (
          <Skeleton className="h-32 w-full" />
        ) : logs.data.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No activity recorded yet — actions like assigning, commenting, and syncing show up here.
          </p>
        ) : (
          <ul className="divide-y">
            {logs.data.data.map((entry) => {
              const Icon = ACTION_META[entry.action]?.icon ?? Activity;
              return (
                <li key={entry.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.actorName ?? "System"}</span>{" "}
                      <span className="text-muted-foreground">{describe(entry)}</span>
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
