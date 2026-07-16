"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/api/client";
import { useOnboarding } from "@/lib/stores/onboarding";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateWorkspacePage() {
  const router = useRouter();
  const businessName = useOnboarding((s) => s.businessName);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  // Seed from onboarding state once it's available.
  useEffect(() => {
    if (businessName && !name) {
      setName(businessName);
      setSlug(slugify(businessName));
    }
  }, [businessName, name]);

  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await authClient.organization.create({ name, slug });
    if (error || !data) {
      setLoading(false);
      toast.error(error?.message ?? "Could not create the workspace.");
      return;
    }

    // Persist the profile collected earlier + kick off the analysis pipeline (P2.2).
    // If it can't run (e.g. no valid website), fall through to the ready screen.
    const workspaceId = data.id;
    const { websiteUrl, category, monthlyBudget } = useOnboarding.getState();
    const normalizedUrl = websiteUrl && !/^https?:\/\//.test(websiteUrl) ? `https://${websiteUrl}` : websiteUrl;
    try {
      if (normalizedUrl) {
        const { jobId } = await api.post<{ jobId: string }>(
          `/workspaces/${workspaceId}/onboarding`,
          {
            websiteUrl: normalizedUrl,
            businessCategory: (category || "other").toLowerCase(),
            monthlyAdBudget: Number(monthlyBudget) || 0,
          }
        );
        router.push(`/onboarding-complete?ws=${workspaceId}&job=${jobId}`);
        return;
      }
    } catch {
      // fall through — workspace exists; just skip the analysis screen
    }
    router.push("/onboarding-complete");
  }

  return (
    <OnboardingShell step={3}>
      <div className="rounded-2xl border bg-card p-8 shadow-lg shadow-black/[0.03] dark:shadow-black/20">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Name your workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is where your channels, insights, and team live.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-slug">Workspace URL</Label>
            <div className="flex items-stretch overflow-hidden rounded-md border transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
              <span className="flex select-none items-center bg-muted px-3 text-sm text-muted-foreground">
                growthos.app/
              </span>
              <Input
                id="ws-slug"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                required
                className="rounded-none border-0 border-l bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading || !name || !slug}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Creating…" : "Create workspace"}
            </Button>
          </div>
        </form>
      </div>
    </OnboardingShell>
  );
}
