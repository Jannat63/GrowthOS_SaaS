"use client";
import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Search, BadgeDollarSign, Instagram, BarChart3, Globe, ShoppingBag, Mail } from "lucide-react";

const integrations = [
  { name: "Google Search Console", icon: Search, category: "SEO", connected: true },
  { name: "Google Ads", icon: BadgeDollarSign, category: "Ads", connected: true },
  { name: "Meta Business Manager", icon: Instagram, category: "Ads", connected: true },
  { name: "Google Analytics 4", icon: BarChart3, category: "Analytics", connected: true },
  { name: "Website / CMS", icon: Globe, category: "Website", connected: true },
  { name: "Shopify", icon: ShoppingBag, category: "E-commerce", connected: false },
  { name: "HubSpot", icon: Mail, category: "CRM", connected: false },
];

export default function IntegrationsPage() {
  const [items, setItems] = useState(integrations);
  return (
    <div>
      <TopBar subtitle="Connect the platforms that power your growth data." />
      <div className="p-6">
        <Card>
          <div className="text-heading-2 mb-4">Connected Platforms</div>
          <div className="divide-y divide-slate-100">
            {items.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-body font-medium">{p.name}</div>
                      <div className="text-caption text-neutral">{p.category}</div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setItems((prev) =>
                        prev.map((x) => (x.name === p.name ? { ...x, connected: !x.connected } : x))
                      )
                    }
                    className={`text-small font-medium ${p.connected ? "text-success" : "text-primary"}`}
                  >
                    {p.connected ? "Connected ✓" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
