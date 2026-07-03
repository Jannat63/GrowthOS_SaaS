import Link from "next/link";
import { Hexagon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  const points = [
    "AI-powered recommendations",
    "Cross-channel insights",
    "Unified analytics & reporting",
    "Save time. Get more growth.",
  ];
  return (
    <div className="max-w-md w-full text-center space-y-6">
      <div className="flex items-center justify-center gap-2">
        <Hexagon className="h-7 w-7 text-primary" fill="currentColor" strokeWidth={0} />
        <span className="font-semibold text-lg">GrowthOS</span>
      </div>
      <h1 className="text-display-2">One Platform. All Channels. Unlimited Growth.</h1>
      <p className="text-body text-neutral">
        GrowthOS unifies SEO, Google Ads, and Meta Ads in one intelligent growth operating system.
      </p>
      <ul className="text-left space-y-2 inline-block">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2 text-body">
            <CheckCircle2 className="h-4 w-4 text-success" /> {p}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 pt-2">
        <Link href="/sign-up"><Button className="w-full">Get Started Free</Button></Link>
        <Button variant="secondary" className="w-full">Book a Demo</Button>
      </div>
    </div>
  );
}
