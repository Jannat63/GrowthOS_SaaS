import { Skeleton } from "@growthos/ui/components/skeleton";
import { LoadingAnnouncement } from "@/components/PageSkeleton";

/**
 * A post that was published after the last deploy is rendered on demand rather than at build time
 * (`dynamicParams`), so the first person to open it waits for the fetch. This is what they see.
 *
 * The measure matches the article's own `max-w-2xl`, and the paragraph blocks are ragged rather
 * than uniform — a stack of identical full-width bars does not read as text, and the shift when
 * real prose replaces it is exactly the jolt a skeleton is supposed to prevent.
 */
const PARAGRAPHS = ["w-full", "w-full", "w-11/12", "w-full", "w-4/5"];

export default function BlogPostLoading() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-20">
      <LoadingAnnouncement what="post" />
      <div aria-hidden="true">
        <Skeleton className="h-3 w-24" />

        <div className="mt-10 flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        <Skeleton className="mt-6 h-11 w-full" />
        <Skeleton className="mt-3 h-11 w-3/4" />
        <Skeleton className="mt-7 h-6 w-full" />

        <div className="mt-10 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <Skeleton className="mt-12 h-72 w-full rounded-xl" />

        <div className="mt-12 space-y-3.5">
          {PARAGRAPHS.map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
        <Skeleton className="mt-10 h-6 w-1/2" />
        <div className="mt-5 space-y-3.5">
          {PARAGRAPHS.map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
      </div>
    </article>
  );
}
