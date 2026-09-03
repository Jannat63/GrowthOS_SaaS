"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { MeResponse } from "@growthos/types";
import { signIn } from "@/lib/auth/client";
import { api } from "@/lib/api/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Label } from "@growthos/ui/components/label";
import { FormError } from "@/components/FormError";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set when arriving from e.g. the accept-invite page, so a returning user with no workspace
  // yet lands back where they meant to go instead of the default onboarding/dashboard split.
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Cleared on every attempt, so a stale rejection never sits under a form that is mid-retry.
    setFormError(null);

    // Better Auth returns `{ error }` for a rejected credential, but *throws* when the request
    // never lands — API down, wrong NEXT_PUBLIC_API_URL, CORS. Without this catch the rejection
    // escapes the handler, `setLoading(false)` is never reached, and the button spins on
    // "Signing in…" forever with nothing explaining why.
    let error: { message?: string } | null = null;
    try {
      ({ error } = await signIn.email({ email, password }));
    } catch {
      setLoading(false);
      setFormError("Can't reach GrowthOS. Check your connection and try again.");
      return;
    }

    if (error) {
      setLoading(false);
      setFormError(error.message ?? "Wrong email or password.");
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

      // Platform staff are not customers and do not own a workspace — every admin route checks
      // `requirePlatformRole` and none of them touch workspace membership. Routing on membership
      // alone sent them into customer onboarding to create a workspace they have no use for, with
      // no link anywhere to the console they actually signed in for. The console's own layout
      // decides whether they still owe it a profile.
      if (me.user.platformRole) {
        router.push("/admin");
        return;
      }

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
            aria-invalid={formError !== null}
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
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={formError !== null}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <FormError>{formError}</FormError>

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
    <Suspense fallback={<AuthFormSkeleton />}>
      <SignInForm />
    </Suspense>
  );
}
