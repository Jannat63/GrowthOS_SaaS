import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about GrowthOS — plans, billing, security, and how the SEO, Google Ads, and Meta Ads loop works together.",
};

const FAQS: { question: string; answer: string }[] = [
  {
    question: "What is GrowthOS?",
    answer:
      "GrowthOS connects your SEO (via Google Search Console), Google Ads, and Meta Ads accounts into one view, then surfaces recommendations that use signals across those channels together — for example, turning a page that already ranks organically into an ad opportunity, or catching a Meta creative before its performance drops.",
  },
  {
    question: "Do I need active ad accounts to get started, or can I use just SEO?",
    answer:
      "You can start with just Google Search Console connected. Google Ads and Meta Ads are separate, optional connections — add them whenever you're ready, and the cross-channel recommendations get more useful as you connect more.",
  },
  {
    question: "How does the free trial work?",
    answer:
      "14 days on the Growth plan, no credit card required to start. If you don't add payment details before the trial ends, trial-only features and data access are paused rather than your account being deleted — you can add billing at any time to pick back up.",
  },
  {
    question: "What's the difference between the plans?",
    answer:
      "Starter ($79/mo) covers 1 workspace, 500 tracked keywords, and 1 team seat — a good fit for a single site. Growth ($199/mo) covers 5 workspaces, 2,500 tracked keywords, 5 team seats, unlimited recommendations, and unlocks GEO tracking and white-label reports. Scale ($399/mo) covers unlimited workspaces, seats, and recommendations, plus API access. Annual billing gets a 20% discount on any plan.",
  },
  {
    question: "Can I manage more than one website or client?",
    answer:
      "Yes, via workspaces — each one is a separate site/business with its own connections and data. Starter includes 1, Growth includes 5, and Scale is unlimited, which is also why Scale suits agencies managing several client accounts.",
  },
  {
    question: "Does GrowthOS make changes to my ad accounts automatically?",
    answer:
      "By default, GrowthOS surfaces recommendations for you to review and approve — nothing changes on a live account without that. Certain lower-risk actions can be set to run automatically if you explicitly turn that on for that specific action type; you're always in control of what's allowed to run unattended.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Credentials for connected accounts (Google, Meta, etc.) are encrypted at rest, connections use OAuth rather than storing your passwords, and all traffic is encrypted in transit. See our Privacy Policy for the full picture of what we collect and how it's used.",
  },
  {
    question: "Can I invite my team?",
    answer:
      "Yes — workspace owners and admins can invite teammates with their own login and permissions. Starter includes 1 seat, Growth includes 5, and Scale is unlimited.",
  },
  {
    question: "Do you offer white-label reporting for agencies?",
    answer:
      "Yes, on the Growth and Scale plans — reports can be exported under your own agency branding rather than GrowthOS's.",
  },
  {
    question: "Is there an API?",
    answer:
      "Yes, on the Scale plan — a Bearer-key-authenticated REST API with OpenAPI documentation, for pulling GrowthOS data into your own tools or dashboards.",
  },
  {
    question: "Can I cancel or change plans anytime?",
    answer:
      "Yes, from Settings → Billing. Plan changes take effect at the start of the next billing period unless stated otherwise at checkout, and you can cancel at any time.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your account and connected-platform data are retained for a reasonable period after cancellation in line with our data retention practices, in case you come back — see our Privacy Policy, or contact us if you'd like it deleted sooner.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl font-bold tracking-tight">Frequently asked questions</h1>
      <p className="mt-3 text-muted-foreground">
        Can&apos;t find what you&apos;re looking for?{" "}
        <a href="/pricing" className="underline underline-offset-4 hover:text-foreground">
          Check the pricing page
        </a>{" "}
        or reach out at [support email].
      </p>

      <div className="mt-10 divide-y rounded-lg border">
        {FAQS.map((item) => (
          <details key={item.question} className="group p-5 open:bg-secondary/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-lg text-muted-foreground transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
