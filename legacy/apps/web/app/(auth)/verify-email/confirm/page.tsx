"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";

function VerifyEmailConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    api
      .post("/api/auth/verify-email/confirm", { token })
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [params]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-body text-neutral">Verifying your email...</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="max-w-sm w-full text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
        <h1 className="text-heading-1">Email verified</h1>
        <Button className="w-full" onClick={() => router.push("/growth-hub")}>Go to Growth Hub</Button>
      </div>
    );
  }

  return (
    <div className="max-w-sm w-full text-center space-y-4">
      <XCircle className="h-12 w-12 text-danger mx-auto" />
      <h1 className="text-heading-1">Verification link invalid or expired</h1>
      <p className="text-small text-neutral">Request a new one from Settings once signed in.</p>
      <Link href="/sign-in"><Button variant="secondary" className="w-full">Back to Sign In</Button></Link>
    </div>
  );
}

// Next.js requires useSearchParams() to be wrapped in Suspense for production
// builds — verified directly: `npm run build` fails without this wrapper
// (caught the same issue on the Google OAuth completion page too).
export default function VerifyEmailConfirmPage() {
  return (
    <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary" />}>
      <VerifyEmailConfirmInner />
    </Suspense>
  );
}
