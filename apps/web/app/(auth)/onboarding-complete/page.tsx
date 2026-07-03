"use client";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function OnboardingCompletePage() {
  const router = useRouter();
  return (
    <div className="max-w-sm w-full text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <PartyPopper className="h-7 w-7" />
      </div>
      <h1 className="text-heading-1">You're all set!</h1>
      <p className="text-small text-neutral">Your workspace is ready. Let's start growing your business.</p>
      <div className="rounded-xl border border-slate-200 p-4 inline-block">
        <div className="text-small text-neutral">Your Growth Score is ready</div>
        <div className="text-display-2 text-success">82</div>
      </div>
      <Button className="w-full" onClick={() => router.push("/growth-hub")}>Go to Growth Hub</Button>
    </div>
  );
}
