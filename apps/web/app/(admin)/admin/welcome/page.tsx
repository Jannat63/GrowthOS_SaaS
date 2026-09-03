"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { useSession, updateUser } from "@/lib/auth/client";
import { platformRoleLabel } from "@/components/admin/labels";

/**
 * The one-time profile step for platform staff.
 *
 * Admins sign up through the ordinary form, so an account granted a platform role by
 * `grant-admin` arrives with whatever name the form captured and nothing else. That was fine while
 * the console showed nobody's name — but the audit log records the actor, and an entry reading
 * `F2daYYXka6…` instead of a person is useless to whoever reads it later. This asks for the name
 * once, before the console opens.
 *
 * It deliberately does NOT ask for a workspace. A platform admin is not a customer: every admin
 * route checks `requirePlatformRole` and none of them touch workspace membership, so staff have no
 * reason to own a workspace. Sending them through customer onboarding to get one was the bug this
 * replaces.
 */
export default function AdminWelcomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Prefill once the session lands. A returning admin editing their details should see what is
  // already stored rather than an empty form that silently overwrites it.
  useEffect(() => {
    if (!user) return;
    setName((prev) => (prev ? prev : (user.name ?? "").trim()));
    setPhone((prev) => (prev ? prev : (user.phone ?? "")));
  }, [user]);

  const trimmedName = name.trim();
  const nameMissing = trimmedName.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameMissing || saving) return;
    setSaving(true);

    // Better Auth rejects an update with no fields, and `phone` is optional — so name always goes,
    // and phone is sent as null when cleared rather than omitted, which is what actually erases it.
    const { error } = await updateUser({
      name: trimmedName,
      phone: phone.trim() || null,
    });

    setSaving(false);
    if (error) {
      toast.error(error.message ?? "Couldn't save your details — try again.");
      return;
    }
    router.replace("/admin");
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {user?.platformRole ? platformRoleLabel(user.platformRole) : "Platform staff"}
        </span>
      </div>

      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        Before you go in
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Everything you do in the console is written to the audit log under your name, including the
        pages you only look at. So it needs a name to write.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            {/* Read-only: it is the identity the account signs in with, not a profile detail. */}
            <Input
              id="admin-email"
              value={isPending ? "" : (user?.email ?? "")}
              readOnly
              disabled
              aria-describedby="admin-email-hint"
            />
            <p id="admin-email-hint" className="text-xs text-muted-foreground">
              This is the account you signed in with and cannot be changed here.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-name">
              Name <span className="text-muted-foreground">(required)</span>
            </Label>
            <Input
              id="admin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How you should appear in the audit log"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-phone">
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="admin-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="For reaching you about an incident"
              autoComplete="tel"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={nameMissing || saving}>
              {saving ? "Saving…" : "Open the console"}
            </Button>
            {nameMissing && (
              <span className="text-xs text-muted-foreground">A name is required.</span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
