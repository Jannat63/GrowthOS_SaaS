import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BrandingProvider } from "@/components/layout/BrandingProvider";
import { WorkspaceSocketProvider } from "@/components/layout/WorkspaceSocketProvider";
import { SampleDataNotice } from "@/components/dashboard/SampleDataNotice";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <BrandingProvider />
      <WorkspaceSocketProvider />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1800px] px-4 py-6 md:px-8 md:py-8 xl:px-10">
            <SampleDataNotice />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
