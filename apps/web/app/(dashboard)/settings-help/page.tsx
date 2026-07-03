"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getStoredUser, clearSession } from "@/lib/api/auth";

export default function SettingsHelpPage() {
  const router = useRouter();
  const user = getStoredUser();

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
