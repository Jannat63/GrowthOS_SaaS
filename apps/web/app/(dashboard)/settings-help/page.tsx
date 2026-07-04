"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { getStoredUser, clearSession } from "@/lib/api/auth";
import { api } from "@/lib/api/client";

export default function SettingsHelpPage() {
  const router = useRouter();
  const user = getStoredUser();
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleResendVerification() {
    if (!user?.email) return;
    setResendStatus("sending");
    try {
      await api.post("/api/auth/verify-email/request", { email: user.email });
    } finally {
      setResendStatus("sent");
    }
  }

  function handleSignOut() {
    clearSession();
    router.push("/welcome");
  }

  return (
    <div>
      <TopBar subtitle="Manage your account preferences and get support." />
      <div className="p-6 space-y-6">
        <Card className="max-w-lg">
          <div className="text-heading-2 mb-4">Profile</div>
          <div className="space-y-3">
            <Input placeholder="Full name" defaultValue={user?.fullName ?? ""} />
            <Input placeholder="Email" defaultValue={user?.email ?? ""} disabled />
            <Button>Save Changes</Button>
          </div>
        </Card>

        <Card className="max-w-lg">
          <div className="text-heading-2 mb-2">Email Verification</div>
          {resendStatus === "sent" ? (
            <Alert type="info" message="If your account exists, a verification email has been sent (check your inbox — or the auth-service logs if SendGrid isn't configured yet)." />
          ) : (
            <>
              <p className="text-body text-neutral mb-3">Didn't get a verification email, or need a new link?</p>
              <Button variant="secondary" loading={resendStatus === "sending"} onClick={handleResendVerification}>
                Resend Verification Email
              </Button>
            </>
          )}
        </Card>

        <Card className="max-w-lg">
          <div className="text-heading-2 mb-2">Need Help?</div>
          <p className="text-body text-neutral mb-3">Our support team responds within a few hours.</p>
          <Button variant="secondary">Contact Support</Button>
        </Card>

        <Card className="max-w-lg border-danger/20">
          <div className="text-heading-2 mb-2">Sign Out</div>
          <p className="text-body text-neutral mb-3">This clears your session on this device.</p>
          <Button variant="danger" onClick={handleSignOut}>Sign Out</Button>
        </Card>
      </div>
    </div>
  );
}
