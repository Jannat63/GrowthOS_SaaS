"use client";
import { TopBar } from "@/components/layout/TopBar";
import { ModuleTabs } from "@/components/layout/ModuleTabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

const tabs = [
  { label: "Overview", href: "/analytics" },
  { label: "Traffic Analytics", href: "/analytics/traffic-analytics" },
  { label: "Behavior Analytics", href: "/analytics/behavior-analytics" },
  { label: "Conversions", href: "/analytics/conversions" },
  { label: "Events", href: "/analytics/events" },
  { label: "Attribution", href: "/analytics/attribution" },
  { label: "Custom Reports", href: "/analytics/custom-reports" },
];

export default function CustomReportsPage() {
  return (
    <div>
      <TopBar subtitle="Build custom analytics reports with your own metrics and dimensions." />
      <ModuleTabs items={tabs} />
      <div className="p-6">
        <Card className="flex flex-col items-center justify-center text-center py-16">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Plus className="h-5 w-5" />
          </div>
          <div className="text-heading-2 mb-1">No custom reports yet</div>
          <p className="text-body text-neutral max-w-sm mb-4">
            Combine any metrics and dimensions from across your channels into a saved custom view.
          </p>
          <Button>Create Custom Report</Button>
        </Card>
      </div>
    </div>
  );
}
