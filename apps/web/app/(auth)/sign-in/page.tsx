"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { MeResponse } from "@growthos/types";
import { signIn } from "@/lib/auth/client";
import { api } from "@/lib/api/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set when arriving from e.g. the accept-invite page, so a returning user with no workspace
  // yet lands back where they meant to go instead of the default onboarding/dashboard split.
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message ?? "Wrong email or password.");
      return;
    }

    if (callbackUrl) {
      router.push(callbackUrl);
      return;
    }

    // Returning users with a workspace go straight to the dashboard; only brand-new
    // accounts (no workspace) go through onboarding. Keep the spinner during the check.
    try {
      const me = await api.get<MeResponse>("/auth/me");
      router.push(me.memberships.length > 0 ? "/growth-hub" : "/welcome");
    } catch {
      // If we can't determine membership, avoid the onboarding loop — head to the dashboard.
      router.push("/growth-hub");
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to your GrowthOS workspace.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/sign-in"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to GrowthOS?{" "}
        <Link
          href={callbackUrl ? `/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/sign-up"}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
