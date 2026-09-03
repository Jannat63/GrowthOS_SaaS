"use client";
import { useState } from "react";
import { Webhook, Copy, Check, Trash2, AlertTriangle, RotateCw } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useEnableWebhook,
} from "@/lib/hooks/useWebhooks";

// Mirrors SUBSCRIBABLE_EVENTS in apps/api/src/webhooks/endpoints.ts. The API rejects anything it
// does not recognise, so a drift here surfaces as a 400 rather than a subscription that silently
// never fires.
const EVENT_TYPES = [
  { value: "recommendation:new", label: "New recommendation" },
  { value: "intelligence:report_ready", label: "Weekly report ready" },
  { value: "meta:fatigue_alert", label: "Creative fatigue alert" },
  { value: "analytics:mer_alert", label: "Blended MER anomaly" },
  { value: "job:complete", label: "Job completed" },
  { value: "job:failed", label: "Job failed" },
];
import { cn } from "@/lib/utils/cn";
import { UpgradeNotice, useApiAccess } from "./PlanGate";

export function WebhooksSection({ workspaceId }: { workspaceId: string | null }) {
  const { data, isLoading } = useWebhooks(workspaceId);
  const create = useCreateWebhook(workspaceId);
  const remove = useDeleteWebhook(workspaceId);
  const enable = useEnableWebhook(workspaceId);

  const unlocked = useApiAccess(workspaceId);
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(["recommendation:new"]);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleEvent(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleCreate() {
    if (!url.trim() || selected.length === 0) return;
    const endpoint = await create.mutateAsync({ url: url.trim(), eventTypes: selected });
    setJustCreated(endpoint.secret);
    setUrl("");
  }

  async function copySecret() {
    if (!justCreated) return;
    await navigator.clipboard.writeText(justCreated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const endpoints = data?.data ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Webhooks</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Get events pushed to your own server the moment they happen, instead of polling the API for
        them. Every request is signed with the{" "}
        <a
          href="https://www.standardwebhooks.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Standard Webhooks
        </a>{" "}
        scheme, so you can verify it with an off-the-shelf library.
      </p>

      {justCreated && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">
            Copy this signing secret now — it won&apos;t be shown again.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your listener needs it to verify that a request really came from us.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
              {justCreated}
            </code>
            <Button variant="outline" size="sm" onClick={copySecret}>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {!unlocked && <UpgradeNotice what="Webhook endpoints" />}

      <div className={cn("mt-4 space-y-3", !unlocked && "hidden")}>
        <Input
          placeholder="https://your-server.example.com/hooks/growthos"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((event) => {
            const isOn = selected.includes(event.value);
            return (
              <Button
                key={event.value}
                type="button"
                variant={isOn ? "default" : "outline"}
                size="sm"
                aria-pressed={isOn}
                onClick={() => toggleEvent(event.value)}
              >
                {event.label}
              </Button>
            );
          })}
        </div>
        <Button
          disabled={!url.trim() || selected.length === 0 || create.isPending}
          onClick={handleCreate}
        >
          {create.isPending ? "Adding…" : "Add endpoint"}
        </Button>
      </div>
      {create.isError && (
        <p className="mt-2 text-sm text-destructive">
          {create.error instanceof Error ? create.error.message : "Could not add the endpoint."}
        </p>
      )}

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">No webhook endpoints yet.</p>
        ) : (
          <ul className="space-y-2">
            {endpoints.map((endpoint) => (
              <li key={endpoint.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{endpoint.url}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {endpoint.eventTypes.includes("*")
                        ? "All events"
                        : endpoint.eventTypes
                            .map((t) => EVENT_TYPES.find((e) => e.value === t)?.label ?? t)
                            .join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {endpoint.enabled ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Disabled</Badge>
                    )}
                    {!endpoint.enabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={enable.isPending}
                        onClick={() => enable.mutate(endpoint.id)}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Re-enable
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(endpoint.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/*
                  Surfaced rather than left in the database. An endpoint that has been switched off
                  after repeated failures has stopped receiving events entirely, and the only person
                  who can fix the listener is the one reading this page — telling them silently is
                  the same as not telling them.
                */}
                {!endpoint.enabled && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    Switched off automatically after {endpoint.consecutiveFailures} failed
                    deliveries. Fix your listener, then re-enable — your signing secret is unchanged.
                  </p>
                )}
                {endpoint.enabled && endpoint.consecutiveFailures > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {endpoint.consecutiveFailures} recent{" "}
                    {endpoint.consecutiveFailures === 1 ? "delivery has" : "deliveries have"} failed.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
