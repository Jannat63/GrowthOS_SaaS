"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api, ApiError } from "@/lib/api/client";

const plans = [
  { id: "starter", name: "Starter", price: "$79/mo", features: ["1 website / ad account", "500 keywords tracked", "5 AI recommendations/week"] },
  { id: "growth", name: "Growth", price: "$199/mo", features: ["5 websites / ad accounts", "2,500 keywords tracked", "Unlimited recommendations", "GEO tracking included"] },
  { id: "scale", name: "Scale", price: "$399/mo", features: ["Unlimited accounts", "10,000 keywords tracked", "Full API access", "Custom attribution models"] },
];

export default function WorkspaceBillingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(planId: string) {
    setError(null);
    setLoadingPlan(planId);
    try {
      const res = await api.post<{ checkoutUrl: string }>("/api/auth/billing/checkout", { plan: planId });
      window.location.href = res.checkoutUrl;
    } catch (e) {
      const err = e as ApiError;
      setError(
        err.status === 501
          ? "Billing isn't configured yet on this server — Stripe keys haven't been set."
          : "Couldn't start checkout. Please try again."
      );
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <TopBar subtitle="Manage your workspace, team, and subscription." />
      <div className="p-6 space-y-6">
        {error && <Alert type="warning" message={error} onDismiss={() => setError(null)} />}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-heading-2">Team Members</div>
            <Button size="sm">Invite Member</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { name: "Jannat Rahman", role: "Owner" },
              { name: "Ahsan Habib", role: "Admin" },
            ].map((m) => (
              <div key={m.name} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-small font-medium">
                    {m.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-body">{m.name}</span>
                </div>
                <Badge tone="neutral">{m.role}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <div className="text-heading-2 mb-4">Plan & Billing</div>
          <div className="grid grid-cols-3 gap-4">
            {plans.map((p) => (
              <Card key={p.id}>
                <div className="text-heading-1">{p.name}</div>
                <div className="text-display-2 mb-3">{p.price}</div>
                <ul className="space-y-1.5 mb-4">
                  {p.features.map((f) => (
                    <li key={f} className="text-small text-neutral">• {f}</li>
                  ))}
                </ul>
                <Button className="w-full" loading={loadingPlan === p.id} onClick={() => handleUpgrade(p.id)}>
                  Upgrade
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
