import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { TheProblem } from "@/components/marketing/TheProblem";
import { SixBridges } from "@/components/marketing/SixBridges";
import { ProductSurfaces } from "@/components/marketing/ProductSurfaces";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { WhoItsFor } from "@/components/marketing/WhoItsFor";
import { PricingTeaser } from "@/components/marketing/PricingTeaser";
import { FAQSection } from "@/components/marketing/FAQ";
import { CTASection } from "@/components/marketing/CTASection";
import { SITE_URL } from "@/lib/seo";

/**
 * The homepage keeps the root layout's title and description — it is the page they were written
 * for — and adds only the one thing they cannot carry: its own address. Without it, the site's
 * most-linked page is also the one most often reached through a campaign parameter, and every
 * one of those variants is a competing copy of the homepage in the index.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Structured data for the homepage — a SoftwareApplication + Organization graph. Notably absent
// before this: for a product whose own Schema Markup Generator feature does exactly this for
// customers, having none on growthos.app's own homepage was worth fixing on principle, not just
// for the (real but modest) search-appearance upside.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "GrowthOS",
      url: SITE_URL,
    },
    {
      "@type": "SoftwareApplication",
      name: "GrowthOS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "GrowthOS turns SEO, Google Ads, and Meta Ads into a single insight loop, so every channel compounds instead of competing.",
      offers: {
        "@type": "Offer",
        price: "79",
        priceCurrency: "USD",
      },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Safe here: JSON_LD is a fully static, hardcoded object above — nothing user-supplied is
        // ever interpolated into it, so there's no injection risk despite dangerouslySetInnerHTML.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Hero />
      <TheProblem />
      <SixBridges />
      <ProductSurfaces />
      <HowItWorks />
      <WhoItsFor />
      <PricingTeaser />
      <FAQSection />
      <CTASection />
    </>
  );
}
