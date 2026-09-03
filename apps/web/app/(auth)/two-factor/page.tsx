"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { MeResponse } from "@growthos/types";
import { twoFactor } from "@/lib/auth/client";
import { api } from "@/lib/api/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";

/**
 * The second factor, after a correct password.
 *
 * Better Auth does not sign anyone in when an account has 2FA enabled: it deletes the half-made
 * session, sets a short-lived challenge cookie, and the client plugin sends the browser here. So
 * until a code is verified there is no session at all — this page is not protecting a live one.
 *
 * Backup codes are accepted in the same box. Someone reaching for one has usually lost their phone,
 * which is the worst possible moment to make them find a different form; the field takes either and
 * tries the code first.
 */
export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim().replace(/\s+/g, "");
    if (!value) return;
    setLoading(true);

    // A TOTP code is six digits; anything else is a backup code. Guessing by shape avoids asking
    // someone to tell us which kind of secret they are holding.
    const isTotp = /^\d{6}$/.test(value);
    const attempt = isTotp
      ? twoFactor.verifyTotp({ code: value, trustDevice })
      : twoFactor.verifyBackupCode({ code: value, trustDevice });

    let error: { message?: string } | null = null;
    try {
      ({ error } = await attempt);
    } catch {
      setLoading(false);
      toast.error("Can't reach GrowthOS. Check your connection and try again.");
      return;
    }

    if (error) {
      setLoading(false);
      toast.error(error.message ?? "That code didn't work. Try the next one.");
      return;
    }

    // Same routing as sign-in: staff to the console, customers to their workspace or onboarding.
    try {
      const me = await api.get<MeResponse>("/auth/me");
      if (me.user.platformRole) {
        router.push("/admin");
        return;
      }
      router.push(me.memberships.length > 0 ? "/growth-hub" : "/welcome");
    } catch {
      router.push("/growth-hub");
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Enter your code
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Open your authenticator app and type the six-digit code for GrowthOS. A backup code works
        here too.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            // `one-time-code` is what lets a phone offer the code from the keyboard bar.
            autoComplete="one-time-code"
            inputMode="text"
            placeholder="123456"
            className="font-mono tracking-[0.2em]"
            autoFocus
            required
          />
        </div>

        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
          />
          <span>Don&rsquo;t ask again on this device for 60 days.</span>
        </label>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Checking…" : "Verify"}
        </Button>
      </form>
    </AuthShell>
  );
}
