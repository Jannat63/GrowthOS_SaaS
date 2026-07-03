import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const plans = [
  { name: "Starter", price: "$79/mo", features: ["1 website / ad account", "500 keywords tracked", "5 AI recommendations/week"] },
  { name: "Growth", price: "$199/mo", features: ["5 websites / ad accounts", "2,500 keywords tracked", "Unlimited recommendations", "GEO tracking included"], current: true },
  { name: "Scale", price: "$399/mo", features: ["Unlimited accounts", "10,000 keywords tracked", "Full API access", "Custom attribution models"] },
];

export default function WorkspaceBillingPage() {
  return (
    <div>
      <TopBar subtitle="Manage your workspace, team, and subscription." />
      <div className="p-6 space-y-6">
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
              <Card key={p.name} className={p.current ? "border-primary ring-1 ring-primary/20" : ""}>
                {p.current && <Badge tone="primary" className="mb-2">Current Plan</Badge>}
                <div className="text-heading-1">{p.name}</div>
                <div className="text-display-2 mb-3">{p.price}</div>
                <ul className="space-y-1.5 mb-4">
                  {p.features.map((f) => (
                    <li key={f} className="text-small text-neutral">• {f}</li>
                  ))}
                </ul>
                <Button variant={p.current ? "secondary" : "primary"} className="w-full" disabled={p.current}>
                  {p.current ? "Current Plan" : "Upgrade"}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
