"use client";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@growthos/ui/components/tabs";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { RankTracker } from "@/components/seo/RankTracker";
import { KeywordClusters } from "@/components/seo/KeywordClusters";
import { OrganicTraffic } from "@/components/seo/OrganicTraffic";
import { SchemaMarkupGenerator } from "@/components/seo/SchemaMarkupGenerator";
import { InternalLinkOptimizer } from "@/components/seo/InternalLinkOptimizer";

export default function SeoPage() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;

  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">SEO</h1>
        <p className="text-sm text-muted-foreground">
          Keyword rankings and organic traffic from Google Search Console, over the last 30 days.
        </p>
      </div>

      <Tabs defaultValue="rankings" className="space-y-6">
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

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        Connect Google Search Console in Settings to replace the sample data with your live data.
      </p>
    </div>
  );
}
