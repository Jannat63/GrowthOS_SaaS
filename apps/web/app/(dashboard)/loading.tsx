import { LoadingAnnouncement, PageSkeleton } from "@/components/PageSkeleton";

/**
 * Shown while a dashboard route's chunk is still arriving.
 *
 * One file for the whole group rather than thirteen. The individual pages already skeleton their
 * own *data* — this covers the gap before that code exists at all, which is the window where the
 * content area was simply blank and the app looked broken on a slow connection.
 */
export default function DashboardLoading() {
  return (
    <>
      <LoadingAnnouncement />
      <PageSkeleton />
    </>
  );
}
