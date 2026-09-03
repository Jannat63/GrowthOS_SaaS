import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { KeyRound, Lock, ShieldCheck, Users, Webhook, ScrollText } from "lucide-react";
import { InlineCTA } from "@/components/marketing/InlineCTA";

export const metadata = pageMeta({
  title: "Security",
  description:
    "How GrowthOS handles platform connections, token storage, workspace isolation, API keys, and outbound webhooks.",
  path: "/security",
});

/** Describes what is implemented today. Deliberately not a compliance page — GrowthOS holds no
 *  third-party audit certification, and claiming one would be worse than saying so. */
const PRACTICES = [
  {
    icon: Lock,
    title: "Read-only platform scopes",
    body: "Connections to Search Console, Google Ads, and Meta request read scopes only. GrowthOS can read performance data and cannot change a bid, edit a campaign, or spend budget — the permission simply is not granted.",
  },
  {
    icon: KeyRound,
    title: "Encrypted tokens, revocable at any time",
    body: "OAuth tokens are encrypted at rest, never returned by any API response, and never written to logs. Disconnecting an integration from settings deletes the stored token immediately rather than marking it inactive.",
  },
  {
    icon: Users,
    title: "Workspace isolation and roles",
    body: "Every data request is scoped to a workspace and checked against your membership before it runs. Five roles — owner, admin, manager, viewer, and client — govern what each member can see and change, so clients can be given a view without being given the account.",
  },
  {
    icon: ShieldCheck,
    title: "Hashed API keys",
    body: "Public API keys are stored only as SHA-256 hashes; the full key is shown once at creation and cannot be recovered afterwards. Keys are scoped to a workspace, individually revocable, and rate-limited per key.",
  },
  {
    icon: Webhook,
    title: "Signed, guarded webhooks",
    body: "Outbound webhooks are signed so your endpoint can verify the payload came from us, retry with jittered backoff, and are validated against internal network addresses before any request is made.",
  },
  {
    icon: ScrollText,
    title: "Audit trail",
    body: "Membership changes, connection changes, billing events, and destructive actions are recorded to an append-only audit log scoped to the workspace, so an agency can answer who changed what.",
  },
];

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-mono text-[11px] tracking-[0.18em] text-primary">SECURITY</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight">
        What we do with your access
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
        Connecting an ad account is a real act of trust. This page describes what GrowthOS
        actually does with that access today — not a roadmap.
      </p>

      <InlineCTA />

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {PRACTICES.map((p) => (
          <div key={p.title} className="rounded-xl border bg-card p-6 shadow-xs">
            <p.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-display text-base font-semibold tracking-tight">
              {p.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-xl border border-warning/40 bg-warning/[0.06] p-6">
        <p className="font-mono text-[10px] tracking-[0.14em] text-warning">WHAT WE DO NOT CLAIM</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          GrowthOS does not currently hold SOC 2, ISO 27001, or any other third-party security
          certification. If your procurement process requires one, we are not yet the right fit,
          and we would rather tell you that here than in a questionnaire six weeks from now.
        </p>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Found something that looks wrong? Report it through the contact route listed in our{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-4">
          privacy policy
        </Link>
        . We would rather hear about it early.
      </p>
    </div>
  );
}
