import { pageMeta } from "@/lib/seo";
import { CookiePreferences } from "@/components/marketing/CookiePreferences";
import { Detail, LEGAL } from "@/lib/legal";

export const metadata = pageMeta({
  title: "Cookie Policy",
  description: "The cookies GrowthOS uses — an essential sign-in cookie, and an optional analytics cookie where enabled.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <strong>Draft, not legal advice.</strong> This reflects what GrowthOS actually sets today
        (see the table below) but hasn&apos;t been reviewed by counsel for your specific
        jurisdictions&apos; consent-banner or disclosure requirements (e.g. GDPR/ePrivacy, CCPA).
        Have a qualified lawyer review it — especially if you enable analytics — before this is
        published or relied on.
      </p>

      <h1 className="mt-8 font-display text-4xl font-bold tracking-tight">Cookie Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: <Detail value={LEGAL.lastUpdated} label="DATE — set on review" />
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-lg font-semibold">1. What this covers</h2>
          <p className="mt-2 text-muted-foreground">
            This explains the cookies and similar technologies GrowthOS uses on our website and
            application, why we use them, and how to control them. It&apos;s deliberately short —
            we don&apos;t use advertising or cross-site tracking cookies, so there isn&apos;t much
            to disclose.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">2. Cookies we use</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Cookie</th>
                  <th className="px-4 py-2 font-medium">Purpose</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">better-auth.session_token</td>
                  <td className="px-4 py-2 text-muted-foreground">Keeps you signed in</td>
                  <td className="px-4 py-2 text-muted-foreground">Essential</td>
                  <td className="px-4 py-2 text-muted-foreground">Session / up to 30 days</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">ph_*</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    Product analytics (which features get used) — PostHog. Only set if we&apos;ve
                    enabled analytics for this deployment; many self-hosted or early-stage
                    deployments don&apos;t.
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">Analytics (optional)</td>
                  <td className="px-4 py-2 text-muted-foreground">Up to 1 year</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-muted-foreground">
            We don&apos;t use advertising cookies, and we don&apos;t run a Meta Pixel, Google Ads
            conversion tag, or similar cross-site ad-tracking technology on our own site — even
            though the product itself connects to those platforms on your behalf once you sign up.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">3. Essential vs. optional</h2>
          <p className="mt-2 text-muted-foreground">
            The session cookie is essential — the Service can&apos;t keep you signed in without
            it, so there&apos;s no opt-out for it short of not using GrowthOS. The analytics
            cookie is optional and only present if this deployment has product analytics turned
            on; disabling it (see Section 4) doesn&apos;t affect your ability to use the Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">4. Managing cookies</h2>
          <p className="mt-2 text-muted-foreground">
            You are asked once, in a banner, the first time you visit — and you can change the
            answer here at any time. Declining stops the analytics SDK from loading at all rather
            than loading it and asking it not to look.
          </p>
          <CookiePreferences />
          <p className="mt-3 text-muted-foreground">
            Separately, most browsers let you block or delete cookies in their privacy settings.
            Blocking the session cookie will sign you out.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">5. Changes to this policy</h2>
          <p className="mt-2 text-muted-foreground">
            If we add a new cookie category — for example, if we later add marketing cookies —
            we&apos;ll update this page and, where required, ask for consent first.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">6. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about this policy? Contact us at{" "}
            <Detail value={LEGAL.privacyEmail} label="PRIVACY EMAIL" />. See also our{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
