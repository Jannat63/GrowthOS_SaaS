"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { twoFactor, useSession } from "@/lib/auth/client";

/**
 * Turning on two-factor, for platform staff.
 *
 * The console grants read access to every customer account on the platform, and a password alone
 * was the whole barrier to it. The layout will not open the console for anyone holding a platform
 * role until this is done — a wall rather than a nag, because a security control that can be
 * dismissed is one that will be.
 *
 * Three steps, in order, because each depends on the last: prove it is you, store the secret in an
 * authenticator, then prove the authenticator works before anything starts relying on it. A
 * mis-copied key therefore cannot lock anyone out — nothing is switched on until a real code
 * verifies.
 *
 * Backup codes appear once and are never retrievable. That is the plugin's design rather than a
 * limitation to route around, so the copy says so plainly instead of implying they can be fetched
 * again later.
 */
export default function AdminSecurityPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const enabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled
  );

  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"none" | "secret" | "codes">("none");

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);

    /**
     * Better Auth returns `{ error }` for a rejected credential but *throws* when the request never
     * lands — the API restarting, a wrong NEXT_PUBLIC_API_URL, CORS. Without this catch the
     * rejection escapes the handler, `setBusy(false)` never runs, and the button sits on
     * "Working…" behind a red error overlay with nothing explaining why. Same rule as the sign-in
     * form.
     */
    let data: { totpURI: string; backupCodes?: string[] } | null = null;
    let error: { message?: string } | null = null;
    try {
      ({ data, error } = await twoFactor.enable({ password }));
    } catch {
      setBusy(false);
      toast.error("Can't reach GrowthOS. If the server just restarted, try again in a moment.");
      return;
    }
    setBusy(false);

    if (error || !data) {
      toast.error(error?.message ?? "That password didn't match.");
      return;
    }
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes ?? []);
    setPassword("");
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim().replace(/\s+/g, "");
    if (!value) return;
    setBusy(true);

    let error: { message?: string } | null = null;
    try {
      ({ error } = await twoFactor.verifyTotp({ code: value }));
    } catch {
      setBusy(false);
      toast.error("Can't reach GrowthOS. Check your connection and try again.");
      return;
    }
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "That code didn't work. Try the next one.");
      return;
    }
    toast.success("Two-factor is on. The console is open.");
    router.replace("/admin");
  }

  function copy(what: "secret" | "codes") {
    const text = what === "secret" ? (totpUri ? secretOf(totpUri) : null) : backupCodes.join("\n");
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(what);
        setTimeout(() => setCopied("none"), 2000);
      },
      () => toast.error("Couldn't copy. Select the text and copy it by hand.")
    );
  }

  if (enabled) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <h1 className="font-display text-xl font-semibold tracking-tight">Two-factor is on</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You will be asked for a code from your authenticator when you sign in. If you lose the
          device, use a backup code — and if those are gone too, another super admin can sign you
          out everywhere so you can set it up again.
        </p>
        <Button variant="secondary" onClick={() => router.push("/admin")}>
          Back to the console
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Turn on two-factor</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The console can read every customer account on the platform. A password on its own is not
          enough to stand between that and a phishing email, so platform staff need a second factor
          before it opens.
        </p>
      </div>

      {!totpUri ? (
        <Card className="p-5">
          <form onSubmit={start} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tf-password">Your password</Label>
              <PasswordInput
                id="tf-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <p className="text-xs text-muted-foreground">
                Confirms it is you before a new secret is created.
              </p>
            </div>
            <Button type="submit" disabled={!password || busy}>
              {busy ? "Working…" : "Continue"}
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-sm font-medium">1. Add it to your authenticator</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                1Password, Authy, Google Authenticator — whichever you use. Add it by setup key.
              </p>
            </div>

            {/*
              No QR code, and deliberately not a fake one.

              The `otpauth://` URI carries the TOTP secret, so the usual shortcut — handing it to a
              QR image service — would give a third party the exact credential this page exists to
              protect. Drawing one locally needs a real encoder (Reed-Solomon and the rest), which
              is a dependency rather than something to hand-roll inside a security flow. Every
              authenticator supports manual entry, so that is the honest option until the library is
              added.
            */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Account</p>
                <p className="mt-0.5 break-all font-mono text-sm">{accountLabel(totpUri)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Setup key</p>
                <p className="mt-0.5 break-all rounded-md border bg-secondary/40 p-2.5 font-mono text-sm tracking-wider">
                  {secretOf(totpUri) ?? totpUri}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => copy("secret")}>
                {copied === "secret" ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy the key
                  </>
                )}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Choose &ldquo;enter a setup key&rdquo; in your authenticator and paste this. On a
                phone,{" "}
                <a href={totpUri} className="underline underline-offset-4">
                  this link opens it directly
                </a>
                .
              </p>
            </div>
          </Card>

          {backupCodes.length > 0 && (
            <Card className="space-y-3 border-warning/40 p-5">
              <div>
                <p className="text-sm font-medium">2. Save your backup codes</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Each one signs you in once if you lose your phone.{" "}
                  <strong className="text-warning">They are shown now and never again</strong> — put
                  them in your password manager before you continue.
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border bg-secondary/40 p-3 font-mono text-xs">
                {backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" onClick={() => copy("codes")}>
                {copied === "codes" ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy all
                  </>
                )}
              </Button>
            </Card>
          )}

          <Card className="p-5">
            <form onSubmit={finish} className="space-y-4">
              <div>
                <p className="text-sm font-medium">3. Prove it works</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Type the current six-digit code. Nothing is switched on until this succeeds, so a
                  mis-copied key cannot lock you out.
                </p>
              </div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                placeholder="123456"
                className="font-mono tracking-[0.2em]"
                aria-label="Six-digit code"
                required
              />
              <Button type="submit" disabled={!code || busy}>
                {busy ? "Checking…" : "Turn on two-factor"}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}

/** The label an authenticator shows — issuer and account, out of the otpauth URI. */
function accountLabel(uri: string): string {
  try {
    return decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, "")) || "GrowthOS";
  } catch {
    return "GrowthOS";
  }
}

function secretOf(uri: string): string | null {
  try {
    return new URL(uri).searchParams.get("secret");
  } catch {
    return null;
  }
}
