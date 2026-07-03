"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getMe, storeSession } from "@/lib/api/auth";

export default function GoogleOAuthCompletePage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      router.push("/sign-in");
      return;
    }
    // The backend already issued a full session — fetch the user profile
    // to populate storeSession() the same way sign-in/sign-up do.
    getMe(token)
      .then((me) => {
        storeSession({ token, userId: me.userId, workspaceId: me.workspaceId, fullName: me.fullName, email: me.email });
        router.push("/growth-hub");
      })
      .catch(() => router.push("/sign-in"));
  }, [params, router]);

  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-body text-neutral">Finishing sign-in with Google...</p>
    </div>
  );
}
