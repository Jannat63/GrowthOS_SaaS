"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { useAcceptInvitation, useInvitationPreview } from "@/lib/hooks/useInvitations";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@growthos/ui/components/button";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

const STATUS_MESSAGE: Record<string, string> = {
  accepted: "This invitation has already been accepted.",
  revoked: "This invitation has been revoked by a workspace admin.",
  expired: "This invitation has expired — ask an admin to send a new one.",
};

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const { data: session, isPending: sessionLoading } = useSession();
  const { data: preview, isLoading, isError } = useInvitationPreview(id);
  const accept = useAcceptInvitation();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);

  if (!id) {
    return (
      <AuthShell>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Invalid invitation link
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is missing its invitation id — check that you copied the whole link from the
          email.
        </p>
      </AuthShell>
    );
  }

  if (isLoading || sessionLoading) {
    return (
      <AuthShell>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </AuthShell>
    );
  }

  if (isError || !preview) {
    return (
      <AuthShell>
        <XCircle className="h-8 w-8 text-destructive" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          Invitation not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This invitation link isn&apos;t valid — it may have been revoked, or the link may be
          incorrect.
        </p>
      </AuthShell>
    );
  }

  if (preview.status !== "pending") {
    return (
      <AuthShell>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {preview.workspaceName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{STATUS_MESSAGE[preview.status]}</p>
      </AuthShell>
    );
  }

  const callbackUrl = `/accept-invite?id=${id}`;

  if (!session) {
    return (
      <AuthShell>
        <Mail className="h-8 w-8 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
          You&apos;ve been invited to {preview.workspaceName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          As <span className="font-medium capitalize text-foreground">{preview.role}</span>. Sign
          in or create an account with{" "}
          <span className="font-medium text-foreground">{preview.email}</span> to accept.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link
              href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}&email=${encodeURIComponent(preview.email)}`}
            >
              Create account
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const emailMatches = session.user.email.toLowerCase() === preview.email.toLowerCase();

  if (!emailMatches) {
    return (
      <AuthShell>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Wrong account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re signed in as {session.user.email}, but this invitation was sent to{" "}
          <span className="font-medium text-foreground">{preview.email}</span>. Sign out and sign
          in with that address to accept.
        </p>
      </AuthShell>
    );
  }

  // Fresh bindings, not just narrowed references — a plain `const` at this point has a real
  // `string` type from birth, so it stays that type inside handleAccept's closure below (unlike
  // `id`/`preview`, whose early-return narrowing doesn't carry into a nested function body).
  const invitationId: string = id;
  const workspaceName: string = preview.workspaceName;

  async function handleAccept() {
    try {
      const result = await accept.mutateAsync(invitationId);
      setActiveWorkspaceId(result.workspaceId);
      toast.success(`You've joined ${workspaceName}.`);
      router.push("/growth-hub");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept the invitation.");
    }
  }

  return (
    <AuthShell>
      <CheckCircle2 className="h-8 w-8 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
        Join {preview.workspaceName}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You&apos;ve been invited as{" "}
        <span className="font-medium capitalize text-foreground">{preview.role}</span>.
      </p>
      <Button className="mt-6 w-full" disabled={accept.isPending} onClick={handleAccept}>
        {accept.isPending && <Loader2 className="animate-spin" />}
        {accept.isPending ? "Joining…" : "Accept invitation"}
      </Button>
    </AuthShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
