import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@growthos/ui/components/button";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-10 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
          Check your inbox
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We&rsquo;ve sent a verification link to your email. Open it to confirm
          your address, then head to your workspace.
        </p>
        {/* Email verification delivery is wired up in a later milestone (M2). */}
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild>
            <Link href="/welcome">Continue</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
