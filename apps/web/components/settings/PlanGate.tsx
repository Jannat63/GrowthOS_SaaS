"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import { PLAN_LIMITS, type Plan } from "@growthos/types";
import { useSubscription } from "@/lib/hooks/useBilling";

/**
 * Whether this workspace's plan includes API access (keys and webhooks).
 *
 * Both sections already told the reader they "require the Scale plan" — in body copy, above
 * controls that were fully enabled. So the actual sequence was: type a name, press Create, and
 * receive a server error. The plan is in the client cache the whole time, and `PLAN_LIMITS` is the
 * billing contract, so the gate can be honest before anyone types.
 *
 * Unknown plan reads as unlocked. The server is the real gate; guessing "locked" while the
 * subscription is still loading would flash a wall at a customer who has already paid for it.
 */
export function useApiAccess(workspaceId: string | null): boolean {
  const { data } = useSubscription(workspaceId);
  const plan = data?.data.plan as Plan | undefined;
  return plan ? PLAN_LIMITS[plan].apiAccess : true;
}

/** Shown in place of the controls a plan does not include, with the way to change that. */
export function UpgradeNotice({ what }: { what: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed p-4">
      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{what} are part of the Scale plan.</p>
      <Link
        href="/settings?tab=billing"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Compare plans
      </Link>
    </div>
  );
}
