import { Skeleton } from "@growthos/ui/components/skeleton";
import { LoadingAnnouncement } from "@/components/PageSkeleton";

/**
 * The blog index fetches its posts from the API on the server, so there is a real wait here — and
 * before this, that wait was a blank page under the site header.
 *
 * Mirrors the page's own structure closely because this one *can*: it is a single known layout, a
 * lead post over a list of rows, so the skeleton can hold the exact space the content will take
 * and nothing shifts when it lands.
 */
export default function BlogIndexLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <LoadingAnnouncement what="posts" />
      <div aria-hidden="true">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-5 h-5 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-5 w-4/5 max-w-2xl" />

        {/* The lead post, which the index renders with its cover at full width. */}
        <Skeleton className="mt-14 h-64 w-full rounded-xl" />

        <div className="mt-4 border-t">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-5 border-b py-6">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-5 w-3/4" />
              </div>
              <Skeleton className="h-16 w-24 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
