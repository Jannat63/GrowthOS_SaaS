"use client";

import Link from "next/link";
import type { AdminAuditLogEntry } from "@growthos/types";
import { planLabel, platformRoleLabel } from "@/components/admin/labels";

/**
 * How a recorded action reads on screen.
 *
 * `mutating` separates the handful of entries that changed a customer's account from the many that
 * merely looked at one. In a log where reads vastly outnumber writes, an undifferentiated list
 * buries the only rows anyone ever goes looking for — which is why the log page defaults to
 * changes only and the reads are one toggle away.
 *
 * Keys match the `action` strings passed to `logAdminAction` in apps/api/src/routes/admin.ts. Add
 * an action there and it should get a line here; an unmapped one falls back to its raw slug, which
 * is ugly on purpose so it gets noticed.
 */
export const AUDIT_ACTIONS: Record<string, { label: string; mutating?: boolean }> = {
  "workspace.list": { label: "Browsed workspaces" },
  "workspace.view": { label: "Opened a workspace" },
  "workspace.usage.view": { label: "Looked at usage" },
  "workspace.activity.view": { label: "Read the activity" },
  "workspace.admin_history.view": { label: "Read the admin history" },
  "workspace.plan_override": { label: "Changed a plan", mutating: true },
  "workspace.extend_trial": { label: "Extended a trial", mutating: true },
  "user.list": { label: "Browsed people" },
  "user.view": { label: "Opened an account" },
  "user.platform_role": { label: "Changed platform access", mutating: true },
  "user.revoke_sessions": { label: "Signed someone out", mutating: true },
  "health.view": { label: "Viewed the overview" },
  "audit_log.view": { label: "Read the audit log" },
  "blog.list": { label: "Browsed the blog" },
  "blog.view": { label: "Opened a post" },
  "blog.create": { label: "Started a post", mutating: true },
  "blog.update": { label: "Edited a post", mutating: true },
  "blog.publish": { label: "Published a post", mutating: true },
  "blog.unpublish": { label: "Unpublished a post", mutating: true },
  "blog.feature": { label: "Changed the pinned post", mutating: true },
  "blog.delete": { label: "Deleted a draft", mutating: true },
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTIONS[action]?.label ?? action;
}

export function isMutatingAction(action: string): boolean {
  return AUDIT_ACTIONS[action]?.mutating === true;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * What the entry actually says, per action.
 *
 * This was `JSON.stringify(metadata)` inside a `max-w-xs truncate`, which meant the reason attached
 * to a plan override — the single most important thing this log records, and the only field the API
 * forces an admin to write — was clipped to about six words of `{"reason":"` before it reached the
 * point.
 */
export function AuditDetail({ action, metadata }: { action: string; metadata: unknown }) {
  const meta = isRecord(metadata) ? metadata : null;
  const reason = str(meta?.reason);
  const before = str(meta?.before);
  const after = str(meta?.after);

  if (action === "workspace.plan_override") {
    return (
      <Detail reason={reason}>
        {before && after && (
          <span className="font-mono text-xs text-muted-foreground">
            {planLabel(before)} to {planLabel(after)}
          </span>
        )}
      </Detail>
    );
  }

  if (action === "workspace.extend_trial") {
    const days = typeof meta?.days === "number" ? meta.days : null;
    return (
      <Detail reason={reason}>
        <span className="font-mono text-xs text-muted-foreground">
          {days !== null ? `+${days} ${days === 1 ? "day" : "days"}` : "extended"}
          {after ? `, now ends ${new Date(after).toLocaleDateString()}` : ""}
        </span>
      </Detail>
    );
  }

  if (action === "user.platform_role") {
    const subject = str(meta?.subjectEmail);
    return (
      <Detail reason={reason}>
        <span className="font-mono text-xs text-muted-foreground">
          {subject ? `${subject}: ` : ""}
          {before ? platformRoleLabel(before) : "Customer"} to{" "}
          {after ? platformRoleLabel(after) : "Customer"}
        </span>
      </Detail>
    );
  }

  if (action === "user.revoke_sessions") {
    const revoked = typeof meta?.revoked === "number" ? meta.revoked : null;
    const subject = str(meta?.subjectEmail);
    return (
      <Detail reason={reason}>
        <span className="font-mono text-xs text-muted-foreground">
          {subject ? `${subject}, ` : ""}
          {revoked !== null ? `${revoked} ${revoked === 1 ? "session" : "sessions"} ended` : "signed out"}
        </span>
      </Detail>
    );
  }

  if (action.startsWith("blog.")) {
    // Deliberately not routed through `Detail`: that helper flags a missing reason in gold, which
    // is right for a change to a customer's account and wrong here — blog writes carry no reason by
    // design (see D-B4), so warning about every one of them would be the log crying wolf.
    const title = str(meta?.title);
    const slug = str(meta?.slug);
    const slugBefore = str(meta?.slugBefore);
    const slugAfter = str(meta?.slugAfter);

    return (
      <div className="space-y-1">
        {title ? (
          <p className="text-sm leading-relaxed">{title}</p>
        ) : (
          <p className="text-sm text-muted-foreground/60">
            —
            <Repeats metadata={meta} />
          </p>
        )}
        {slugBefore && slugAfter ? (
          // The one blog edit that breaks something outside the console, so it is the one spelled
          // out rather than left to be inferred from a title.
          <p className="font-mono text-xs text-warning">
            /blog/{slugBefore} → /blog/{slugAfter}
          </p>
        ) : (
          slug && <p className="font-mono text-xs text-muted-foreground">/blog/{slug}</p>
        )}
      </div>
    );
  }

  if (action === "workspace.list" || action === "user.list") {
    const term = str(meta?.search);
    const filter = str(meta?.filter);
    return (
      <p className="text-sm text-muted-foreground">
        {term ? (
          <>
            Searched <span className="text-foreground">{term}</span>
          </>
        ) : filter ? (
          <>
            Filtered by <span className="text-foreground">{filter.replace(/_/g, " ")}</span>
          </>
        ) : (
          "Full list"
        )}
        <Repeats metadata={meta} />
      </p>
    );
  }

  if (meta && Object.keys(meta).length > 0) {
    // An unmapped action still has to show whatever it recorded, rather than nothing.
    return (
      <p className="break-words font-mono text-xs text-muted-foreground">{JSON.stringify(meta)}</p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground/60">
      —
      <Repeats metadata={meta} />
    </p>
  );
}

function Detail({ reason, children }: { reason: string | null; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {children}
      {reason ? (
        <p className="text-sm leading-relaxed">{reason}</p>
      ) : (
        // The API requires a reason on every write, so a missing one means the row predates that
        // rule or was written by something bypassing the routes. Either is worth flagging.
        <p className="text-sm text-warning">No reason recorded.</p>
      )}
    </div>
  );
}

/**
 * How many times a read repeated inside its five-minute window. Written by `logAdminAction`, which
 * updates the existing row rather than adding one — so the log still says the view happened, and
 * how often, without a screen of identical lines.
 */
function Repeats({ metadata }: { metadata: Record<string, unknown> | null }) {
  const n = typeof metadata?.repeats === "number" ? metadata.repeats : 0;
  if (n < 2) return null;
  return <span className="ml-1.5 font-mono text-xs text-muted-foreground">×{n}</span>;
}

/** Where the entry points. A workspace id in a log is only useful if it takes you to the workspace. */
export function AuditTarget({ entry }: { entry: AdminAuditLogEntry }) {
  if (entry.targetId === "all") {
    return <span className="text-muted-foreground">Platform-wide</span>;
  }
  const href =
    entry.targetType === "workspace"
      ? `/admin/workspaces/${entry.targetId}`
      : entry.targetType === "user"
        ? `/admin/users/${entry.targetId}`
        : entry.targetType === "blog_post"
          ? `/admin/blog/${entry.targetId}`
          : null;

  if (!href) {
    return (
      <span className="font-mono text-xs text-muted-foreground">{entry.targetId.slice(0, 8)}</span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-sm font-mono text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {entry.targetId.slice(0, 8)}
    </Link>
  );
}
