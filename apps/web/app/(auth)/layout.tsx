import { PageTransition } from "@/components/PageTransition";

/**
 * Sign-in, sign-up, and the onboarding steps.
 *
 * These are whole-screen replacements rather than a panel changing inside a shell — there is no
 * rail holding still beside them — so they take the `view` entrance and settle down into place, on
 * the axis a step is read on. Each page brings its own shell (AuthShell, OnboardingShell), so the
 * whole screen including the progress bar is inside the transition; that is the honest picture,
 * since on these routes the whole screen genuinely is new.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <PageTransition variant="view">{children}</PageTransition>
    </div>
  );
}
