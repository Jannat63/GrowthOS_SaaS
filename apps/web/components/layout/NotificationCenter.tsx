"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Recommendation } from "@growthos/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@growthos/ui/components/dropdown-menu";
import { Badge } from "@growthos/ui/components/badge";
import { cn } from "@/lib/utils/cn";
import { useRecommendations } from "@/lib/hooks/useRecommendations";

// Each recommendation type routes to the module that owns it.
const ROUTE: Record<string, string> = {
  cross_channel: "/growth-hub",
  paid_to_organic: "/content-pipeline",
  organic_to_paid: "/creative-queue",
  fatigue_alert: "/fatigue-monitor",
};

const TYPE_LABEL: Record<string, string> = {
  cross_channel: "Cross-channel",
  paid_to_organic: "Content",
  organic_to_paid: "Creative",
  fatigue_alert: "Fatigue",
};

export function NotificationCenter({ workspaceId }: { workspaceId: string | null }) {
  const { data } = useRecommendations(workspaceId);
  const pending: Recommendation[] = (data?.data ?? [])
    .filter((r) => r.status === "pending")
    .slice(0, 8);
  const count = pending.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors",
          "hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <Bell className="h-4.5 w-4.5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-semibold text-primary-foreground">
            {count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Action center</span>
          <Badge variant="muted">{count} open</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&rsquo;re all caught up.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {pending.map((r) => (
              <li key={r.id}>
                <Link
                  href={ROUTE[r.type] ?? "/growth-hub"}
                  className="flex flex-col gap-1 px-2 py-2 transition-colors hover:bg-primary/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {TYPE_LABEL[r.type] ?? r.type}
                    </span>
                    {/*
                      compositeScore, not impactScore. This list arrives in the API's order, which
                      is composite descending — labelling it with a different field made the number
                      contradict the order it was sitting in, the same defect the Recommendations
                      queue carried.
                    */}
                    <Badge variant="outline">Priority {r.compositeScore}</Badge>
                  </div>
                  <span className="line-clamp-2 text-sm font-medium">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
