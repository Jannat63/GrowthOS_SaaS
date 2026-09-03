"use client";
import { useEffect, useState } from "react";
import { Timer, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@growthos/ui/components/accordion";
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

/**
 * Scheduled refresh — the loop that regenerates the weekly report and raises alerts.
 *
 * Renamed from "Automation". The sidebar has an Automation *module* about standing orders and an
 * approval queue; this is the intelligence refresh cadence. Two unrelated features sharing one word
 * inside one product is a collision a reader has no way to resolve, and the settings page put them
 * eight hundred pixels apart under the same heading.
 *
 * The tick log is collapsed. Ten rows of mostly zeroes made it the tallest single block on the old
 * settings page — roughly a fifth of the whole scroll — for something that is pure observability and
 * is read perhaps once, when someone is checking whether the loop is alive. The summary answers that
 * question in one line; the table is one click away for when it doesn't.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const CADENCES: { label: string; ms: number }[] = [
  { label: "Hourly", ms: HOUR },
  { label: "Daily", ms: DAY },
  { label: "Weekly", ms: 7 * DAY },
];

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

  // Only meaningful once something has loaded; an empty list and a failed request look the same
  // here, so the summary speaks only about what it actually has.
  const rows = runs?.data ?? [];
  const errors = rows.reduce((n, r) => n + r.errorCount, 0);
  const refreshed = rows.reduce((n, r) => n + r.refreshedCount, 0);

  const dirty =
    automation !== undefined &&
    (enabled !== automation.data.enabled || cadenceMs !== automation.data.cadenceMs);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display flex-1 text-lg font-semibold tracking-tight">
          Scheduled refresh
        </h2>
        {automation && <DataSourceBadge source={automation.source} />}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        How often GrowthOS regenerates your intelligence report and re-checks for MER anomalies and
        creative fatigue. Separate from the Automation module, which proposes changes to your
        campaigns.
      </p>

      {!automation ? (
        <Skeleton className="mt-5 h-32 w-full" />
      ) : (
        <div className="mt-5 grid max-w-xl gap-5">
          <div className="grid gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
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
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
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
            <Button onClick={() => save.mutate({ enabled, cadenceMs })} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            {/* The old trailing line restated the two controls directly above it ("Currently
                refreshing weekly"), which is the one thing a reader looking at them already knows.
                What is worth saying is whether what they see is saved. */}
            {dirty && !save.isPending && (
              <span className="text-sm text-warning">Unsaved changes.</span>
            )}
            {!dirty && save.isSuccess && !save.isPending && (
              <span className="text-sm text-success">Saved.</span>
            )}
          </div>
        </div>
      )}

      <Accordion type="single" collapsible className="mt-6 border-t">
        <AccordionItem value="runs" className="border-b-0">
          <AccordionTrigger className="text-sm">
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-left">
              <span className="font-medium">Run history</span>
              <span className="font-mono text-[11px] font-normal text-muted-foreground">
                {rows.length === 0
                  ? "no ticks recorded"
                  : `last ${rows.length} ticks · ${refreshed} refreshed`}
              </span>
              {rows.length > 0 &&
                (errors > 0 ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-normal text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {errors} error{errors === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-normal text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    no errors
                  </span>
                ))}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {!runs ? (
              <Skeleton className="h-32 w-full" />
            ) : rows.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No runs yet — the loop records a row each time it ticks.
              </p>
            ) : (
              <div className="overflow-x-auto">
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
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {new Date(r.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {r.refreshedCount}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {r.alertCount}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              r.errorCount > 0 ? "text-destructive" : "text-muted-foreground",
                            )}
                          >
                            {r.errorCount > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                            {r.errorCount}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
