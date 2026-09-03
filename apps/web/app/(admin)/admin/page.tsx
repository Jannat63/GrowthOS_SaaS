"use client";
import { Building2, Users, Clock, PieChart } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useAdminHealth } from "@/lib/hooks/useAdmin";

export default function AdminOverviewPage() {
  const { data: health, isLoading } = useAdminHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-neutral-400">Platform-wide numbers, across every workspace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-neutral-800 bg-neutral-900 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Building2 className="h-3.5 w-3.5" /> Total workspaces
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-16 bg-neutral-800" />
          ) : (
            <p className="mt-2 font-display text-3xl font-semibold text-neutral-50">{health?.totalWorkspaces}</p>
          )}
        </Card>
        <Card className="border-neutral-800 bg-neutral-900 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Users className="h-3.5 w-3.5" /> Total users
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-16 bg-neutral-800" />
          ) : (
            <p className="mt-2 font-display text-3xl font-semibold text-neutral-50">{health?.totalUsers}</p>
          )}
        </Card>
        <Card className="border-neutral-800 bg-neutral-900 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Clock className="h-3.5 w-3.5" /> Trials ending in 3 days
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-16 bg-neutral-800" />
          ) : (
            <p className="mt-2 font-display text-3xl font-semibold text-neutral-50">{health?.trialsEndingSoonCount}</p>
          )}
        </Card>
      </div>

      <Card className="border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
          <PieChart className="h-4 w-4 text-neutral-500" /> Workspaces by plan
        </div>
        {isLoading ? (
          <Skeleton className="mt-4 h-24 w-full bg-neutral-800" />
        ) : (
          <div className="mt-4 space-y-2">
            {health?.workspacesByPlan.map((row) => (
              <div key={row.plan} className="flex items-center justify-between border-b border-neutral-800 py-2 text-sm last:border-0">
                <span className="capitalize text-neutral-300">{row.plan}</span>
                <span className="font-medium tabular-nums text-neutral-100">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
