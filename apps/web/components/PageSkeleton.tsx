import { Skeleton } from "@growthos/ui/components/skeleton";

/**
 * The shape of a page that has not arrived yet.
 *
 * Route-level `loading.tsx` files render this. It is deliberately generic — a heading, a row of
 * summary figures, a wide block — because a route-group boundary cannot know which of a dozen
 * pages is coming, and a skeleton that guesses a specific layout wrong is more disorienting than
 * one that only claims "a page, roughly this shape".
 *
 * Lives at the components root next to PageTransition: both are chrome that belongs to no single
 * feature, and this one is shared by the dashboard and the console.
 */
export function PageSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: stats }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

/**
 * The announcement half.
 *
 * A skeleton is decoration to a screen reader — hence `aria-hidden` above, because reading out
 * eight empty boxes is worse than silence. This says the one thing that matters, once, politely
 * enough not to interrupt whatever is currently being read.
 */
export function LoadingAnnouncement({ what = "page" }: { what?: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      Loading {what}…
    </p>
  );
}
