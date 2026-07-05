"use client";

import { useRouter } from "next/navigation";
import { useOnboarding } from "@/lib/stores/onboarding";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";

export default function BusinessInfoPage() {
  const router = useRouter();
  const { businessName, websiteUrl, category, monthlyBudget, update } =
    useOnboarding();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Persisted to the backend in a later milestone (M2); held in client state for now.
    router.push("/connect-accounts");
  }

  return (
    <OnboardingShell step={1}>
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Tell us about your business
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This tailors your first cross-channel recommendations.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => update({ businessName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://"
              value={websiteUrl}
              onChange={(e) => update({ websiteUrl: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g. Ecommerce"
                value={category}
                onChange={(e) => update({ category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyBudget">Monthly ad budget</Label>
              <Input
                id="monthlyBudget"
                inputMode="numeric"
                placeholder="$"
                value={monthlyBudget}
                onChange={(e) => update({ monthlyBudget: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </div>
    </OnboardingShell>
  );
}
