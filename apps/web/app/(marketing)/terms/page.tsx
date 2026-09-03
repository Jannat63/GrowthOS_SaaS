import { pageMeta } from "@/lib/seo";

const LAST_UPDATED = "[DATE — set when this is reviewed and published]";

export const metadata = pageMeta({
  title: "Terms of Service",
  description: "The terms governing use of GrowthOS.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <strong>Draft, not legal advice.</strong> This is a starting-point template for a SaaS
        Terms of Service, not a reviewed legal document. Have a qualified lawyer in your
        jurisdiction review and customize it — especially the bracketed placeholders — before
        this is published or relied on.
      </p>

      <h1 className="mt-8 font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-lg font-semibold">1. Agreement to terms</h2>
          <p className="mt-2 text-muted-foreground">
            These Terms of Service (&quot;Terms&quot;) govern access to and use of GrowthOS
            (the &quot;Service&quot;), provided by [Company Legal Name] (&quot;GrowthOS,&quot;
            &quot;we,&quot; &quot;us&quot;). By creating an account or using the Service, you agree
            to these Terms on behalf of yourself and, if applicable, the organization you represent.
            If you don&apos;t agree, don&apos;t use the Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">2. The Service</h2>
          <p className="mt-2 text-muted-foreground">
            GrowthOS connects to your SEO, Google Ads, and Meta Ads accounts to surface
            cross-channel recommendations, reports, and (where you enable it) automated actions.
            We may add, change, or remove features at any time. Some features depend on
            third-party platforms (Google, Meta, DataForSEO, and others) and may be limited by
            those platforms&apos; availability, rate limits, or policies, which are outside our
            control.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">3. Accounts and workspaces</h2>
          <p className="mt-2 text-muted-foreground">
            You&apos;re responsible for the accuracy of the information you provide, for keeping
            your login credentials confidential, and for all activity under your account. A
            workspace owner or admin can invite team members and manage their access. You must
            be at least 18 (or the age of majority in your jurisdiction) to create an account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">4. Subscriptions, billing, and trials</h2>
          <p className="mt-2 text-muted-foreground">
            Paid plans are billed in advance on a monthly or annual basis through our payment
            processor (Stripe). The 14-day free trial does not require a credit card; if you don&apos;t
            add payment details before the trial ends, trial-only features and data access may be
            paused. You can cancel or change plans at any time from Settings → Billing; changes
            take effect at the start of the next billing period unless stated otherwise at
            checkout. Fees are non-refundable except where required by law or stated explicitly
            in these Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">5. Acceptable use</h2>
          <p className="mt-2 text-muted-foreground">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Use the Service to violate any law or third-party platform&apos;s terms (including Google Ads, Meta, and Google Search Console policies);</li>
            <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems;</li>
            <li>Reverse-engineer, scrape, or resell the Service without our written permission;</li>
            <li>Upload content or connect accounts you don&apos;t have the right to use;</li>
            <li>Use the Service to send spam, malware, or content that infringes others&apos; rights.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">6. Connected third-party accounts</h2>
          <p className="mt-2 text-muted-foreground">
            When you connect a Google, Meta, or other third-party account, you authorize GrowthOS
            to access and act on that account within the scope you grant (e.g. reading rankings,
            reading or adjusting ad campaigns). You can disconnect any account at any time from
            Settings. We are not responsible for changes those third parties make to their APIs,
            pricing, or policies.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">7. Your data and ownership</h2>
          <p className="mt-2 text-muted-foreground">
            You retain ownership of the content and data you connect to or upload into the
            Service (&quot;Customer Data&quot;). You grant us a license to host, process, and
            display Customer Data solely to provide and improve the Service. See our{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </a>{" "}
            for how we handle personal data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">8. Recommendations are not guarantees</h2>
          <p className="mt-2 text-muted-foreground">
            GrowthOS surfaces recommendations and automations based on the data available to it.
            We don&apos;t guarantee any specific ranking, ad performance, revenue, or business
            outcome. You&apos;re responsible for reviewing and approving any recommended action
            before it&apos;s applied to a live ad account or website, unless you&apos;ve
            explicitly enabled automatic execution for that action type.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">9. Termination</h2>
          <p className="mt-2 text-muted-foreground">
            You may cancel your account at any time. We may suspend or terminate access for
            breach of these Terms, non-payment, or to comply with law. On termination, your right
            to use the Service ends; we&apos;ll retain or delete Customer Data per our data
            retention practices and applicable law.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">10. Disclaimers and limitation of liability</h2>
          <p className="mt-2 text-muted-foreground">
            The Service is provided &quot;as is&quot; without warranties of any kind, express or
            implied. To the maximum extent permitted by law, GrowthOS will not be liable for
            indirect, incidental, or consequential damages, or for lost profits or data, arising
            from use of the Service. Our total liability for any claim is limited to the amount
            you paid us in the 12 months before the claim arose. [Refine this section with counsel
            — enforceability varies significantly by jurisdiction.]
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">11. Changes to these Terms</h2>
          <p className="mt-2 text-muted-foreground">
            We may update these Terms from time to time. We&apos;ll notify you of material changes
            (e.g. by email or in-app notice) before they take effect. Continued use after changes
            take effect means you accept the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">12. Governing law</h2>
          <p className="mt-2 text-muted-foreground">
            These Terms are governed by the laws of [Jurisdiction], without regard to conflict-of-law
            principles. [Confirm jurisdiction and dispute-resolution process with counsel.]
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">13. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Questions about these Terms? Contact us at [support email].
          </p>
        </section>
      </div>
    </div>
  );
}
