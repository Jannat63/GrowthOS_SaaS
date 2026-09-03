import { pageMeta } from "@/lib/seo";
import { Detail, LEGAL } from "@/lib/legal";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description: "How GrowthOS collects, uses, and protects your data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <strong>Draft, not legal advice.</strong> This is a starting-point template for a SaaS
        Privacy Policy, not a reviewed legal document. It doesn&apos;t yet reflect specific
        obligations you may have (GDPR, CCPA, or others) based on where your users are located.
        Have a qualified lawyer review and customize it — especially the bracketed placeholders —
        before this is published or relied on.
      </p>

      <h1 className="mt-8 font-display text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: <Detail value={LEGAL.lastUpdated} label="DATE — set on review" />
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-lg font-semibold">1. What this covers</h2>
          <p className="mt-2 text-muted-foreground">
            This Privacy Policy explains what data GrowthOS (&quot;we,&quot; &quot;us&quot;)
            collects when you use the Service, how we use it, and the choices you have. It
            applies to our website and application, not to third-party sites you connect to or
            that we link out to.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">2. Information we collect</h2>
          <p className="mt-2 text-muted-foreground">We collect:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong>Account information</strong> — name, email, workspace/organization details, and authentication data.</li>
            <li><strong>Billing information</strong> — handled by our payment processor, Stripe; we store your plan, subscription status, and billing history, not your full card number.</li>
            <li>
              <strong>Connected platform data</strong> — when you connect Google Search Console, Google Ads,
              Meta Ads, or similar, we access the data those platforms make available (e.g. rankings,
              campaign performance, ad spend) within the scope you authorize.
            </li>
            <li>
              <strong>Usage data</strong> — which features get used, to improve the Service. This is
              collected through PostHog and only after you agree to it; declining the analytics
              cookie means it is not collected at all, and the Service works the same either way.
            </li>
            <li><strong>Communications</strong> — messages you send us for support or feedback.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">3. How we use information</h2>
          <p className="mt-2 text-muted-foreground">We use the information above to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Provide, maintain, and improve the Service, including generating recommendations and reports;</li>
            <li>Process payments and manage subscriptions;</li>
            <li>Send transactional email (trial reminders, billing receipts and failures, security notices) and, where you&apos;ve opted in, product updates;</li>
            <li>Detect, prevent, and respond to fraud, abuse, or security issues;</li>
            <li>Comply with legal obligations.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            We don&apos;t sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">4. Sharing information</h2>
          <p className="mt-2 text-muted-foreground">We share information with:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <strong>Service providers</strong> we rely on to run GrowthOS: Neon (managed Postgres,
              for account and workspace data), ClickHouse (the time-series store behind the metrics),
              Stripe (payments — they hold your card details, we do not), Resend (transactional
              email), and PostHog (product analytics, only with your consent).
            </li>
            <li>
              <strong>Connected platforms</strong> — we read from Google and Meta within the
              read-only scopes you grant. We send them nothing about you beyond what an
              authenticated read requires, and we cannot change anything in those accounts.
            </li>
            <li><strong>Legal or safety reasons</strong> — if required by law, or to protect the rights, property, or safety of GrowthOS, our users, or others.</li>
            <li><strong>Business transfers</strong> — if GrowthOS is involved in a merger, acquisition, or asset sale, in which case we&apos;ll notify you.</li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Our own staff are the case worth stating plainly. GrowthOS platform staff can open a
            workspace to investigate a problem or answer a support request. Every such view is
            written to an audit log at the moment it happens — who looked, at what, and when —
            along with every change they make. Staff accounts require two-factor authentication,
            and changes to another account&apos;s billing or access require re-authentication at
            the time of the action.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">5. Data retention</h2>
          <p className="mt-2 text-muted-foreground">
            We retain account and Customer Data for as long as your account is active, and for a
            reasonable period after closure to comply with legal, tax, or accounting requirements,
            or to resolve disputes. You can request earlier deletion — see Section 7.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">6. Security</h2>
          <p className="mt-2 text-muted-foreground">
            Specifically: traffic is encrypted in transit; the OAuth credentials for a connected
            platform are encrypted at rest with AES-256-GCM under a key held outside the database,
            so a copy of the database alone does not yield a usable token; the scopes we request
            are read-only; each workspace&apos;s data is isolated and every data request is checked
            against your membership and role in it; and platform staff accounts require two-factor
            authentication. We hold no third-party security certification — our{" "}
            <a href="/security" className="underline underline-offset-4 hover:text-primary">
              security page
            </a>{" "}
            says so in more detail. No method of transmission or storage is completely secure, and
            we can&apos;t guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">7. Your choices and rights</h2>
          <p className="mt-2 text-muted-foreground">
            You can access, update, or delete most account information from Settings, and
            disconnect any connected platform at any time. Depending on where you live, you may
            have additional rights — such as access, correction, deletion, portability, or
            objection to processing under GDPR, or the rights described under CCPA/CPRA. To
            exercise these rights, contact us at{" "}
            <Detail value={LEGAL.privacyEmail} label="PRIVACY EMAIL" />.{" "}
            <Detail value={null} label="CONFIRM REGIONAL RIGHTS + RESPONSE TIMELINES WITH COUNSEL" />
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">8. Cookies</h2>
          <p className="mt-2 text-muted-foreground">
            We use an essential cookie to keep you signed in, and — only if you agree, and only
            where analytics is enabled for this deployment — one analytics cookie. You are asked
            once, in a banner, and can change the answer at any time from the Cookie Policy. See
            our{" "}
            <a href="/cookies" className="underline underline-offset-4 hover:text-primary">
              Cookie Policy
            </a>{" "}
            for the full list and how to control them.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">9. International data transfers</h2>
          <p className="mt-2 text-muted-foreground">
            Your information may be processed in a country other than where you live. Where
            required, we rely on appropriate safeguards (such as standard contractual clauses)
            for those transfers. [Confirm hosting/data-residency regions and required safeguards
            with counsel.]
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">10. Children&apos;s privacy</h2>
          <p className="mt-2 text-muted-foreground">
            The Service isn&apos;t directed at children and isn&apos;t intended for anyone under
            18. We don&apos;t knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">11. Changes to this policy</h2>
          <p className="mt-2 text-muted-foreground">
            We may update this Privacy Policy from time to time. We&apos;ll notify you of material
            changes before they take effect.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">12. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about this policy, or want to exercise a data right? Contact us at{" "}
            <Detail value={LEGAL.privacyEmail} label="PRIVACY EMAIL" />.
          </p>
        </section>
      </div>
    </div>
  );
}
