import { LoadingAnnouncement, PageSkeleton } from "@/components/PageSkeleton";

/** The console's equivalent of the dashboard's. Directories lead with a table, not with figures. */
export default function AdminLoading() {
  return (
    <>
      <LoadingAnnouncement what="console" />
      <PageSkeleton stats={3} />
    </>
  );
}
