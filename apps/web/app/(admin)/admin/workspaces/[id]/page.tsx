"use client";
import { use, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Skeleton } from "@growthos/ui/components/skeleton";
import type { Plan } from "@growthos/types";
import { useAdminWorkspaceDetail, usePlanOverride } from "@/lib/hooks/useAdmin";

const PLANS: Plan[] = ["starter", "growth", "scale"];

export default function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ws, isLoading } = useAdminWorkspaceDetail(id);
  const override = usePlanOverride(id);
  const [selectedPlan, setSelectedPlan] = useState<Plan | "">("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (isLoading || !ws) {
    return <Skeleton className="h-96 w-full bg-neutral-800" />;
  }

  function submitOverride() {
    if (!selectedPlan || reason.trim().length < 10) return;
    override.mutate(
      { plan: selectedPlan, reason: reason.trim() },
      { onSuccess: () => { setConfirming(false); setReason(""); setSelectedPlan(""); } }
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/workspaces" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-100">
        <ArrowLeft className="h-3.5 w-3.5" /> All workspaces
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-50">{ws.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{ws.slug} · created {new Date(ws.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-sm font-semibold text-neutral-200">Subscription</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-neutral-500">Plan</dt><dd className="capitalize text-neutral-200">{ws.subscription.plan}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">Status</dt><dd><Badge variant={ws.subscription.status === "active" ? "success" : "muted"}>{ws.subscription.status}</Badge></dd></div>
            {ws.subscription.trialEndsAt && (
              <div className="flex justify-between"><dt className="text-neutral-500">Trial ends</dt><dd className="text-neutral-200">{new Date(ws.subscription.trialEndsAt).toLocaleDateString()}</dd></div>
            )}
            {ws.subscription.currentPeriodEnd && (
              <div className="flex justify-between"><dt className="text-neutral-500">Current period ends</dt><dd className="text-neutral-200">{new Date(ws.subscription.currentPeriodEnd).toLocaleDateString()}</dd></div>
            )}
          </dl>

          <div className="mt-6 border-t border-neutral-800 pt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" /> Manual plan override
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Bypasses Stripe entirely. Logged to the audit log with your reason — this is for
              comps and fixing Stripe/app mismatches, not a substitute for a real checkout.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlan(p)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    selectedPlan === p ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {selectedPlan && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for this override (required, 10+ characters)…"
                  rows={2}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-950 p-2 text-xs text-neutral-100 placeholder:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                />
                {!confirming ? (
                  <button
                    onClick={() => setConfirming(true)}
                    disabled={reason.trim().length < 10}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Override to {selectedPlan}
                  </button>
                ) : (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-300">
                      Confirm: set {ws.name}'s plan to <strong className="capitalize">{selectedPlan}</strong>? This is logged.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={submitOverride} disabled={override.isPending} className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-neutral-950">
                        {override.isPending ? "Applying…" : "Yes, apply"}
                      </button>
                      <button onClick={() => setConfirming(false)} className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-sm font-semibold text-neutral-200">Members ({ws.members.length})</h2>
          <ul className="mt-3 space-y-2">
            {ws.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between text-sm">
                <span className="text-neutral-200">{m.name} <span className="text-neutral-500">· {m.email}</span></span>
                <Badge variant="muted">{m.role}</Badge>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 border-t border-neutral-800 pt-4 text-sm font-semibold text-neutral-200">
            Connected platforms ({ws.connections.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {ws.connections.length === 0 ? (
              <p className="text-xs text-neutral-500">No platforms connected.</p>
            ) : (
              ws.connections.map((c) => (
                <li key={c.platform} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-neutral-200">{c.platform.replace(/_/g, " ")}</span>
                  <Badge variant={c.isActive ? "success" : "muted"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
