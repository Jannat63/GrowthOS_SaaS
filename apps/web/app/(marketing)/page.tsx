import { Hero } from "@/components/marketing/Hero";
import { TheProblem } from "@/components/marketing/TheProblem";
import { SixBridges } from "@/components/marketing/SixBridges";
import { ProductSurfaces } from "@/components/marketing/ProductSurfaces";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { WhoItsFor } from "@/components/marketing/WhoItsFor";
import { PricingTeaser } from "@/components/marketing/PricingTeaser";
import { FAQSection } from "@/components/marketing/FAQ";
import { CTASection } from "@/components/marketing/CTASection";

export default function LandingPage() {
  return (
    <>
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
