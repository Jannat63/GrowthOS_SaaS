"use client";
import { useEffect, useState } from "react";
import { Bot, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import { cn } from "@/lib/utils/cn";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";
import { useAutomation, useAutomationActions, useSchedulerRuns } from "@/lib/hooks/useAutomation";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CADENCES: { label: string; ms: number }[] = [
  { label: "Hourly", ms: HOUR },
  { label: "Daily", ms: DAY },
  { label: "Weekly", ms: 7 * DAY },
];

function cadenceLabel(ms: number): string {
  return CADENCES.find((c) => c.ms === ms)?.label ?? `${Math.round(ms / HOUR)}h`;
}

export function AutomationSection({ workspaceId }: { workspaceId: string | null }) {
  const { data: automation } = useAutomation(workspaceId);
  const { data: runs } = useSchedulerRuns(workspaceId);
  const save = useAutomationActions(workspaceId);

  const [enabled, setEnabled] = useState(true);
  const [cadenceMs, setCadenceMs] = useState(7 * DAY);

  useEffect(() => {
    if (!automation) return;
    setEnabled(automation.data.enabled);
    setCadenceMs(automation.data.cadenceMs);
  }, [automation]);

  function onSave() {
    save.mutate({ enabled, cadenceMs });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Automation</h2>
        {automation && <DataSourceBadge source={automation.source} />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The autonomous loop refreshes your weekly intelligence report and pushes new anomaly and
        fatigue alerts in real time — no manual runs.
      </p>

      {!automation ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : (
        <div className="mt-4 grid max-w-xl gap-5">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={enabled ? "default" : "outline"}
                size="sm"
                onClick={() => setEnabled(true)}
              >
                Enabled
              </Button>
              <Button
                type="button"
                variant={!enabled ? "default" : "outline"}
                size="sm"
                onClick={() => setEnabled(false)}
              >
                Paused
              </Button>
            </div>
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Refresh cadence
            </span>
            <div className="flex flex-wrap gap-2">
              {CADENCES.map((c) => (
                <Button
                  key={c.ms}
                  type="button"
                  variant={cadenceMs === c.ms ? "default" : "outline"}
                  size="sm"
                  disabled={!enabled}
                  onClick={() => setCadenceMs(c.ms)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save automation"}
            </Button>
            {save.isSuccess && !save.isPending && (
              <span className="text-sm text-success">Saved.</span>
            )}
          </div>
        </div>
      )}

      {/* Observability: recent scheduler ticks. */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold tracking-tight">Recent activity</h3>
        <div className="mt-3">
          {!runs ? (
            <Skeleton className="h-32 w-full" />
          ) : runs.data.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No scheduler runs yet — the loop records a row each time it ticks.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Refreshed</TableHead>
                  <TableHead className="text-right">Alerts</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.refreshedCount}</TableCell>
                    <TableCell className="text-right">{r.alertCount}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          r.errorCount > 0 ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {r.errorCount > 0 ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        )}
                        {r.errorCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Badge variant="outline">cadence</Badge>
        Currently {enabled ? `refreshing ${cadenceLabel(cadenceMs).toLowerCase()}` : "paused"}.
      </p>
    </Card>
  );
}
