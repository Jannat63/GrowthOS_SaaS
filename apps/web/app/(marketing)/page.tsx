import { Hero } from "@/components/marketing/Hero";
import { StatStrip } from "@/components/marketing/StatStrip";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { SocialProof } from "@/components/marketing/SocialProof";
import { PricingTeaser } from "@/components/marketing/PricingTeaser";
import { CTASection } from "@/components/marketing/CTASection";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <StatStrip />
      <Features />
      <HowItWorks />
      <SocialProof />
      <PricingTeaser />
      <CTASection />
    </>
  );
}
