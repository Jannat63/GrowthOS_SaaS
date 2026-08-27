"use client";
import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@growthos/ui/components/tabs";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useConnections } from "@/lib/hooks/useConnections";
import { RankTracker } from "@/components/seo/RankTracker";
import { KeywordClusters } from "@/components/seo/KeywordClusters";
import { OrganicTraffic } from "@/components/seo/OrganicTraffic";
import { SchemaMarkupGenerator } from "@/components/seo/SchemaMarkupGenerator";
import { InternalLinkOptimizer } from "@/components/seo/InternalLinkOptimizer";

const TABS = ["rankings", "clusters", "traffic", "schema", "links"] as const;
type Tab = (typeof TABS)[number];

function SeoTabs() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const { data: connections } = useConnections(workspaceId);

  /**
   * The open tab lives in the URL.
   *
   * With `defaultValue` alone this page had five tabs and one address: a link could only ever point
   * at the rank tracker, a refresh threw away where you were, and Back stepped out of the page
   * instead of to the previous tab. `replace` rather than `push` so switching tabs does not stack
   * history entries between two real navigations.
   */
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "rankings";

  const setTab = useCallback(
    (next: string) => {
      const q = new URLSearchParams(params.toString());
      q.set("tab", next);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  // Search Console is the one integration wired end to end, so this notice must not be shown to
  // someone who has already connected it — telling a connected user their live data is "sample
  // data" is the same trust problem DataSourceBadge exists to fix.
  const gscConnected = (connections?.data ?? []).some(
    (c) => c.platform === "google_search_console" && c.isActive
  );

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">SEO</h1>
        {/*
          No blanket time claim. "over the last 30 days" applied to two of these five tabs —
          clusters, schema markup and internal links have no time dimension at all, the rank tracker
          reports a 7-day change, and on seeded or lagging data the newest row is weeks behind today,
          so "the last 30 days" was wrong about the period as well as the scope. Each tab that has a
          window now prints its own measured dates.
        */}
        <p className="text-sm text-muted-foreground">
          Keyword rankings, topics and organic traffic from Google Search Console.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="rankings">Rank tracker</TabsTrigger>
          <TabsTrigger value="clusters">Clusters</TabsTrigger>
          <TabsTrigger value="traffic">Organic traffic</TabsTrigger>
          <TabsTrigger value="schema">Schema markup</TabsTrigger>
          <TabsTrigger value="links">Internal links</TabsTrigger>
        </TabsList>
        <TabsContent value="rankings">
          <RankTracker workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="clusters">
          <KeywordClusters workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="traffic">
          <OrganicTraffic workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="schema">
          <SchemaMarkupGenerator workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="links">
          <InternalLinkOptimizer workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>

      {!gscConnected && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          Connect Google Search Console in Settings to replace the sample data with your live data.
        </p>
      )}
    </div>
  );
}

/**
 * `useSearchParams` opts a route into client-side rendering, and Next requires the boundary to be
 * explicit — without it the build fails prerendering this page outright. The fallback mirrors the
 * header and tab strip so the shell does not jump when the tabs resolve.
 */
export default function SeoPage() {
  return (
    <Suspense fallback={<SeoPageSkeleton />}>
      <SeoTabs />
    </Suspense>
  );
}

function SeoPageSkeleton() {
  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">SEO</h1>
        <p className="text-sm text-muted-foreground">
          Keyword rankings, topics and organic traffic from Google Search Console.
        </p>
      </div>
      <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
