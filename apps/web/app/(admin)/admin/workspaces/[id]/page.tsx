"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";
import { channelLabel } from "@growthos/logic";
import type { Plan } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Textarea } from "@growthos/ui/components/textarea";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useAdminWorkspaceDetail, usePlanOverride } from "@/lib/hooks/useAdmin";
import {
  planLabel,
  subscriptionStatusLabel,
  subscriptionTone,
  workspaceRoleLabel,
} from "@/components/admin/labels";

const PLANS: Plan[] = ["starter", "growth", "scale"];
const MIN_REASON = 10;

export default function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: ws, isLoading } = useAdminWorkspaceDetail(id);
  const override = usePlanOverride(id);
  const [selectedPlan, setSelectedPlan] = useState<Plan | "">("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (isLoading || !ws) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const reasonShort = reason.trim().length < MIN_REASON;

  function submitOverride() {
    if (!selectedPlan || reasonShort) return;
    override.mutate(
      { plan: selectedPlan, reason: reason.trim() },
      {
        onSuccess: () => {
          setConfirming(false);
          setReason("");
          setSelectedPlan("");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/workspaces"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All workspaces
      </Link>

      {/*
        Whose account this is, stated plainly.

        This is the safeguard the console's styling is only a proxy for: the risk on this screen is
        not "am I in the admin panel", it is "am I about to change the wrong customer's plan". The
        name is the largest thing on the page, and the identifiers under it are the ones someone
        would paste into a support thread.
      */}
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{ws.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
          <span>{ws.slug}</span>
          {ws.websiteUrl && (
            <a
              href={ws.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ws.websiteUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
          <span>Customer since {new Date(ws.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">Subscription</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Plan">{planLabel(ws.subscription.plan)}</Row>
            <Row label="Status">
              <Badge variant={subscriptionTone(ws.subscription.status)}>
                {subscriptionStatusLabel(ws.subscription.status)}
              </Badge>
            </Row>
            {ws.subscription.trialEndsAt && (
              <Row label="Trial ends">
                {new Date(ws.subscription.trialEndsAt).toLocaleDateString()}
              </Row>
            )}
            {ws.subscription.currentPeriodEnd && (
              <Row label="Period ends">
                {new Date(ws.subscription.currentPeriodEnd).toLocaleDateString()}
              </Row>
            )}
            {ws.subscription.cancelAt && (
              <Row label="Cancels">
                <span className="text-warning">
                  {new Date(ws.subscription.cancelAt).toLocaleDateString()}
                </span>
              </Row>
            )}
          </dl>

          <div className="mt-6 border-t pt-5">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
              Manual plan override
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Changes the plan in GrowthOS without touching Stripe, so the two will disagree until
              billing is corrected too. For comps and for repairing a mismatch &mdash; not a
              substitute for checkout. Your reason is written to the audit log.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {PLANS.map((p) => {
                const current = p === ws.subscription.plan;
                return (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={selectedPlan === p ? "default" : "outline"}
                    disabled={current}
                    aria-pressed={selectedPlan === p}
                    onClick={() => {
                      setSelectedPlan(p);
                      setConfirming(false);
                    }}
                  >
                    {planLabel(p)}
                    {current && <span className="ml-1.5 text-xs opacity-70">(current)</span>}
                  </Button>
                );
              })}
            </div>

            {selectedPlan && (
              <div className="mt-4 space-y-2">
                <label
                  htmlFor="override-reason"
                  className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Reason
                </label>
                <Textarea
                  id="override-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setConfirming(false);
                  }}
                  placeholder="Why this workspace is moving, in enough detail to make sense to someone reading the log in six months."
                  rows={2}
                />
                {/* The button used to sit disabled with no explanation, so the only way to learn
                    the rule was to count characters. */}
                {reasonShort && (
                  <p className="text-xs text-muted-foreground">
                    {reason.trim().length === 0
                      ? "A reason is required."
                      : `${MIN_REASON - reason.trim().length} more characters needed.`}
                  </p>
                )}

                {!confirming ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={reasonShort}
                    onClick={() => setConfirming(true)}
                  >
                    Move to {planLabel(selectedPlan)}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm">
                      Move <span className="font-medium">{ws.name}</span> from{" "}
                      {planLabel(ws.subscription.plan)} to{" "}
                      <span className="font-medium">{planLabel(selectedPlan)}</span>?
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={submitOverride}
                        disabled={override.isPending}
                      >
                        {override.isPending ? "Applying…" : "Apply override"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(false)}
                        disabled={override.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Members{" "}
              <span className="font-mono text-sm font-normal text-muted-foreground">
                {ws.members.length}
              </span>
            </h2>
            {ws.members.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nobody has joined this workspace yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y">
                {ws.members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{m.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.email}
                      </span>
                    </span>
                    <Badge variant="muted">{workspaceRoleLabel(m.role)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Connected platforms{" "}
              <span className="font-mono text-sm font-normal text-muted-foreground">
                {ws.connections.length}
              </span>
            </h2>
            {ws.connections.length === 0 ? (
              // The likeliest reason a support ticket about "no data" exists at all.
              <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nothing connected, so every figure in this workspace is sample data.
              </p>
            ) : (
              <ul className="mt-4 divide-y">
                {ws.connections.map((c) => (
                  <li
                    key={c.platform}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0">
                      {/* channelLabel, not a local slug map — see packages/logic/src/channels.ts. */}
                      <span className="block truncate text-sm">{channelLabel(c.platform)}</span>
                      {c.accountName && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.accountName}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      {c.lastSyncedAt && (
                        <span className="font-mono text-xs text-muted-foreground">
                          synced {new Date(c.lastSyncedAt).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant={c.isActive ? "success" : "muted"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
