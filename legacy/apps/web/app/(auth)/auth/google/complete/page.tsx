"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getMe, storeSession } from "@/lib/api/auth";

function GoogleOAuthCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      router.push("/sign-in");
      return;
    }
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

// Next.js requires useSearchParams() to be wrapped in Suspense for production
// builds — verified directly: `npm run build` fails without this wrapper.
export default function GoogleOAuthCompletePage() {
  return (
    <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary" />}>
      <GoogleOAuthCompleteInner />
    </Suspense>
  );
}
