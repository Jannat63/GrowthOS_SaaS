"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { channelLabel } from "@growthos/logic";
import type { AdminWorkspaceDetail, Plan } from "@growthos/types";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { Separator } from "@growthos/ui/components/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@growthos/ui/components/tabs";
import {
  useAdminAccess,
  useAdminWorkspaceActivity,
  useAdminWorkspaceDetail,
  useAdminWorkspaceHistory,
  useAdminWorkspaceUsage,
  useExtendTrial,
  usePlanOverride,
} from "@/lib/hooks/useAdmin";
import { ReasonAction } from "@/components/admin/ReasonAction";
import { AuditDetail, auditActionLabel } from "@/components/admin/audit";
import {
  moneyLabel,
  planLabel,
  subscriptionStatusLabel,
  workspaceRoleLabel,
} from "@/components/admin/labels";
import {
  badgeVariantForTone,
  connectionTone,
  spineClass,
  subscriptionTone,
  toneTextClass,
  trialTone,
} from "@/components/admin/tone";
import { absoluteTime, daysSince, daysUntil, relativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import { PLAN_LIMITS, PLAN_PRICE_USD_CENTS } from "@growthos/types";

/**
 * One customer's account, as a file rather than a page.
 *
 * The previous version put subscription state, the plan override, the member list and the
 * connection list on one screen, and had nothing to say about usage, activity, or what platform
 * staff had already done to the account. Six tabs, because the six questions are asked at
 * different moments: what are they paying, who are they, what is connected, what are they using,
 * what have they been doing, and what have we done to them.
 *
 * Only the open tab fetches. Each of these routes writes an audit-log row, so loading all six on
 * arrival would record five views nobody performed.
 */

const PLANS: Plan[] = ["starter", "growth", "scale"];
const TABS = ["account", "people", "connections", "usage", "activity", "history"] as const;
type Tab = (typeof TABS)[number];

export default function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: ws, isLoading, isError } = useAdminWorkspaceDetail(id);
  const { data: access } = useAdminAccess();
  const [tab, setTab] = useState<Tab>("account");

  const isSuperAdmin = access?.platformRole === "super_admin";

  if (isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">No workspace with that ID.</p>
      </div>
    );
  }

  if (isLoading || !ws) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      {/*
        Whose account this is, stated plainly.

        This is the safeguard the console's styling is only a proxy for: the risk on this screen is
        not "am I in the admin panel", it is "am I about to change the wrong customer's plan". The
        name is the largest thing here, and the identifiers under it are the ones someone would
        paste into a support thread.
      */}
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">{ws.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground">
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
          <span title={absoluteTime(ws.createdAt)}>Customer since {relativeTime(ws.createdAt)}</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="people">People ({ws.members.length})</TabsTrigger>
          <TabsTrigger value="connections">Connections ({ws.connections.length})</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="history">Admin history</TabsTrigger>}
        </TabsList>

        <TabsContent value="account" className="mt-5">
          <AccountTab ws={ws} isSuperAdmin={isSuperAdmin} />
        </TabsContent>
        <TabsContent value="people" className="mt-5">
          <PeopleTab ws={ws} />
        </TabsContent>
        <TabsContent value="connections" className="mt-5">
          <ConnectionsTab ws={ws} />
        </TabsContent>
        <TabsContent value="usage" className="mt-5">
          <UsageTab workspaceId={id} active={tab === "usage"} />
        </TabsContent>
        <TabsContent value="activity" className="mt-5">
          <ActivityTab workspaceId={id} active={tab === "activity"} />
        </TabsContent>
        {isSuperAdmin && (
          <TabsContent value="history" className="mt-5">
            <HistoryTab workspaceId={id} active={tab === "history"} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── Account ──────────────────────────────────────────────────────────────────

function AccountTab({ ws, isSuperAdmin }: { ws: AdminWorkspaceDetail; isSuperAdmin: boolean }) {
  const override = usePlanOverride(ws.id);
  const extend = useExtendTrial(ws.id);
  const [selectedPlan, setSelectedPlan] = useState<Plan | "">("");
  const [days, setDays] = useState(14);

  const sub = ws.subscription;
  const trialDays = sub.status === "trialing" ? daysUntil(sub.trialEndsAt) : null;
  const tone = subscriptionTone(sub.status) !== "neutral"
    ? subscriptionTone(sub.status)
    : trialTone(trialDays);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="p-5">
        <h2 className="font-display text-base font-semibold tracking-tight">Subscription</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <Row label="Plan">
            <span className="font-mono">{planLabel(sub.plan)}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {moneyLabel(PLAN_PRICE_USD_CENTS[sub.plan])} list
            </span>
          </Row>
          <Row label="Status">
            <Badge variant={badgeVariantForTone(tone)}>
              {subscriptionStatusLabel(sub.status)}
            </Badge>
          </Row>
          {sub.trialEndsAt && (
            <Row label="Trial ends">
              <span className={cn("font-mono", toneTextClass(trialTone(trialDays)))}>
                <span title={absoluteTime(sub.trialEndsAt)}>{relativeTime(sub.trialEndsAt)}</span>
              </span>
            </Row>
          )}
          {sub.currentPeriodEnd && (
            <Row label="Period ends">
              <span className="font-mono" title={absoluteTime(sub.currentPeriodEnd)}>
                {relativeTime(sub.currentPeriodEnd)}
              </span>
            </Row>
          )}
          {sub.cancelAt && (
            <Row label="Cancels">
              <span className="font-mono text-warning" title={absoluteTime(sub.cancelAt)}>
                {relativeTime(sub.cancelAt)}
              </span>
            </Row>
          )}
          <Row label="In Stripe">
            {ws.stripeCustomerId ? (
              <a
                href={`https://dashboard.stripe.com/customers/${ws.stripeCustomerId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-sm font-mono text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ws.stripeCustomerId}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">
                Never checked out — no Stripe customer yet
              </span>
            )}
          </Row>
        </dl>
      </Card>

      {isSuperAdmin ? (
        <Card className="space-y-6 p-5">
          <ReasonAction
            title="Move this workspace to another plan"
            description="Changes the plan in GrowthOS without touching Stripe, so the two will disagree until billing is corrected too. For comps and for repairing a mismatch — not a substitute for checkout."
            confirmLabel={selectedPlan ? `Move to ${planLabel(selectedPlan)}` : "Move plan"}
            destructive
            ready={Boolean(selectedPlan)}
            pending={override.isPending}
            confirmation={
              <>
                Move <span className="font-medium">{ws.name}</span> from {planLabel(sub.plan)} to{" "}
                {selectedPlan ? planLabel(selectedPlan) : ""}, without changing Stripe?
              </>
            }
            onConfirm={(reason) => {
              if (!selectedPlan) return;
              override.mutate(
                { plan: selectedPlan, reason },
                { onSuccess: () => setSelectedPlan("") }
              );
            }}
          >
            <div className="flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={selectedPlan === p ? "default" : "outline"}
                  disabled={p === sub.plan}
                  aria-pressed={selectedPlan === p}
                  onClick={() => setSelectedPlan(selectedPlan === p ? "" : p)}
                >
                  {planLabel(p)}
                  {p === sub.plan && <span className="ml-1.5 text-xs opacity-70">current</span>}
                </Button>
              ))}
            </div>
          </ReasonAction>

          <Separator />

          <ReasonAction
            title="Give them more trial"
            description="Adds days to the end of the current trial, or to today if it has already lapsed — so extending a trial never shortens one."
            confirmLabel={`Add ${days} ${days === 1 ? "day" : "days"}`}
            ready={days >= 1 && days <= 90}
            pending={extend.isPending}
            confirmation={
              <>
                Extend <span className="font-medium">{ws.name}</span>&rsquo;s trial by {days}{" "}
                {days === 1 ? "day" : "days"}
                {sub.trialEndsAt && trialDays !== null && trialDays >= 0
                  ? `, from ${relativeTime(sub.trialEndsAt)}`
                  : ", starting today"}
                ?
              </>
            }
            onConfirm={(reason) => extend.mutate({ days, reason })}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-24 font-mono"
                aria-label="Days to add"
              />
              <span className="text-sm text-muted-foreground">days, up to 90</span>
            </div>
          </ReasonAction>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Changing a plan or extending a trial needs super admin. You can read everything on this
            account, which is what support work needs.
          </p>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

// ── People ───────────────────────────────────────────────────────────────────

function PeopleTab({ ws }: { ws: AdminWorkspaceDetail }) {
  if (ws.members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nobody belongs to this workspace. It was created and then abandoned, or every member has
        since been removed.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {ws.members.map((m) => (
        <li key={m.userId} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <Link
              href={`/admin/users/${m.userId}`}
              className="truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {m.name || "No name set"}
            </Link>
            <p className="truncate font-mono text-xs text-muted-foreground">{m.email}</p>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {workspaceRoleLabel(m.role)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Connections ──────────────────────────────────────────────────────────────

function ConnectionsTab({ ws }: { ws: AdminWorkspaceDetail }) {
  if (ws.connections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing is connected, so this workspace has no data to show its owner. That is usually why
        an account looks empty.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {ws.connections.map((c) => {
        const quiet = daysSince(c.lastSyncedAt);
        const tone = connectionTone(c.isActive ?? true, quiet);
        return (
          <li
            key={`${c.platform}-${c.accountName ?? ""}`}
            className={cn("border-l-2 px-4 py-3", spineClass(tone))}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              {/* Slugs never reach the screen — CLAUDE.md. */}
              <span className="text-sm font-medium">{channelLabel(c.platform)}</span>
              <span className={cn("font-mono text-xs", toneTextClass(tone))}>
                {c.isActive === false ? (
                  "disconnected"
                ) : (
                  <span title={absoluteTime(c.lastSyncedAt)}>
                    {c.lastSyncedAt ? `synced ${relativeTime(c.lastSyncedAt)}` : "never synced"}
                  </span>
                )}
              </span>
            </div>
            {c.accountName && (
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{c.accountName}</p>
            )}
            {c.syncError && (
              <p className="mt-1.5 text-xs leading-relaxed text-destructive">{c.syncError}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Usage ────────────────────────────────────────────────────────────────────

function UsageTab({ workspaceId, active }: { workspaceId: string; active: boolean }) {
  const { data, isLoading } = useAdminWorkspaceUsage(workspaceId, active);

  if (isLoading || !data) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-base font-semibold tracking-tight">
          What they are using
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Against the ceiling on {planLabel(data.plan)}. At the ceiling is an upgrade conversation;
          nowhere near it on a paid plan is a churn risk.
        </p>
      </div>

      <ul className="space-y-4">
        {data.metrics.map((m) => {
          const pct = m.limit === null ? 0 : Math.min(100, (m.used / m.limit) * 100);
          const tight = m.limit !== null && pct >= 80;
          return (
            <li key={m.metric}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span>{metricLabel(m.metric)}</span>
                <span className="font-mono text-xs tabular-nums">
                  {m.used}
                  <span className="text-muted-foreground">
                    {" / "}
                    {m.limit === null ? "unlimited" : m.limit}
                  </span>
                </span>
              </div>
              {m.limit !== null && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full", tight ? "bg-warning" : "bg-primary")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div>
        <h3 className="text-sm font-medium">Included on this plan</h3>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
          {data.features.map((f) => (
            <li key={f.feature} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  f.enabled ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              <span className={f.enabled ? "" : "text-muted-foreground"}>
                {featureLabel(f.feature)}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2 text-muted-foreground">
            <span className="font-mono text-xs">
              {PLAN_LIMITS[data.plan].teamMembers === Infinity
                ? "unlimited"
                : PLAN_LIMITS[data.plan].teamMembers}
            </span>
            seats
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Storage names are not reading matter — same rule as `channelLabel` for channel slugs. */
function metricLabel(metric: string): string {
  const NAMES: Record<string, string> = {
    recommendations_generated: "Recommendations generated",
    ai_creatives_generated: "Creative variants generated",
  };
  return NAMES[metric] ?? metric;
}

function featureLabel(feature: string): string {
  const NAMES: Record<string, string> = {
    whiteLabel: "White-label reports",
    geoTracking: "Location tracking",
    apiAccess: "API access",
  };
  return NAMES[feature] ?? feature;
}

// ── Activity ─────────────────────────────────────────────────────────────────

function ActivityTab({ workspaceId, active }: { workspaceId: string; active: boolean }) {
  const { data, isLoading } = useAdminWorkspaceActivity(workspaceId, active);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing recorded. Nobody has done anything in this workspace and nothing has run for it.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {data.map((item, i) => {
        const broken = item.kind === "job" && item.status === "failed";
        return (
          <li
            key={`${item.kind}-${item.at}-${i}`}
            className={cn("border-l-2 px-4 py-2.5", spineClass(broken ? "broken" : "neutral"))}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <span className="text-sm">
                {item.kind === "audit" ? (
                  <>
                    {auditActionLabel(item.action)}{" "}
                    <span className="text-muted-foreground">
                      by {item.actorName ?? "the system"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-xs">{item.type}</span>{" "}
                    <span className={broken ? "text-destructive" : "text-muted-foreground"}>
                      {item.status}
                    </span>
                  </>
                )}
              </span>
              <span
                className="font-mono text-xs text-muted-foreground"
                title={absoluteTime(item.at)}
              >
                {relativeTime(item.at)}
              </span>
            </div>
            {item.kind === "job" && item.error && (
              <p className="mt-1 text-xs leading-relaxed text-destructive">{item.error}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Admin history ────────────────────────────────────────────────────────────

function HistoryTab({ workspaceId, active }: { workspaceId: string; active: boolean }) {
  const { data, isLoading } = useAdminWorkspaceHistory(workspaceId, active);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Everything platform staff have done to this account, including pages they only looked at.
        This is what makes &ldquo;who looked at my account, and why&rdquo; answerable.
      </p>

      {!data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody from our side has opened this account.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {data.map((entry) => (
            <li key={entry.id} className="px-4 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-sm">
                  {auditActionLabel(entry.action)}{" "}
                  <span className="text-muted-foreground">
                    by {entry.actorName ?? entry.actorEmail ?? "an unknown account"}
                  </span>
                </span>
                <span
                  className="font-mono text-xs text-muted-foreground"
                  title={absoluteTime(entry.createdAt)}
                >
                  {relativeTime(entry.createdAt)}
                </span>
              </div>
              <AuditDetail action={entry.action} metadata={entry.metadata} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/workspaces"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All workspaces
    </Link>
  );
}
