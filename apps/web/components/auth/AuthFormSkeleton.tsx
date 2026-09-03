import { Skeleton } from "@growthos/ui/components/skeleton";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { LoadingAnnouncement } from "@/components/PageSkeleton";

/**
 * What the auth pages show while their client bundle resolves.
 *
 * Every one of them reads `useSearchParams`, which forces a Suspense boundary — and all four fell
 * back to `null`, so the entire screen was blank until the chunk arrived. On a fast connection
 * that is a flicker; on a slow one it is a white page at the exact moment someone is deciding
 * whether this product works.
 *
 * It renders the real `AuthShell`, so the brand panel, the mark and the theme toggle are painted
 * immediately and only the form itself is placeholder. Nothing moves when the form replaces it.
 */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <AuthShell>
      <LoadingAnnouncement what="form" />
      <div aria-hidden="true">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-3 h-4 w-56" />

        <div className="mt-8 space-y-4">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        <Skeleton className="mx-auto mt-6 h-4 w-48" />
      </div>
    </AuthShell>
  );
}

/**
 * The onboarding steps use `OnboardingShell`, not `AuthShell`, so they need their own — a fallback
 * that paints the wrong chrome and then swaps it is worse than one that paints none.
 *
 * The step number is passed through, so the progress rail is already on the correct step when the
 * placeholder appears and does not jump when the real content arrives.
 */
export function OnboardingSkeleton({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <OnboardingShell step={step}>
      <LoadingAnnouncement what="step" />
      <div aria-hidden="true" className="mt-10 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="mt-8 h-48 w-full rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
    </OnboardingShell>
  );
}
