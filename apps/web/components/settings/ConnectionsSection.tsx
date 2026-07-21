"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search, Check, RefreshCw, Loader2, MousePointerClick, Megaphone } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Badge } from "@growthos/ui/components/badge";
import { useConnections } from "@/lib/hooks/useConnections";
import { useConnectionActions } from "@/lib/hooks/useConnectionActions";

const PROVIDERS = [
  { platform: "google_search_console", name: "Google Search Console", desc: "Organic search & rankings", icon: Search, ready: true },
  { platform: "google_ads", name: "Google Ads", desc: "Paid search — coming soon", icon: MousePointerClick, ready: false },
  { platform: "meta", name: "Meta Ads", desc: "Facebook & Instagram — coming soon", icon: Megaphone, ready: false },
] as const;

export function ConnectionsSection({ workspaceId }: { workspaceId: string | null }) {
  const params = useSearchParams();
  const { data } = useConnections(workspaceId);
  const { connect, disconnect, sync } = useConnectionActions(workspaceId);

  useEffect(() => {
    if (params.get("connected")) toast.success("Connected — syncing your data now.");
    const err = params.get("connect_error");
    if (err) {
      toast.error(
        err === "no_account"
          ? "No Search Console site found on that Google account."
          : "Couldn't connect — please try again."
      );
    }
  }, [params]);

  const byPlatform = new Map(
    (data?.data ?? []).filter((c) => c.isActive).map((c) => [c.platform, c])
  );

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Connections</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect a channel to sync real data into GrowthOS.
      </p>
      <div className="mt-4 space-y-3">
        {PROVIDERS.map((p) => {
          const conn = byPlatform.get(p.platform);
          const Icon = p.icon;
          return (
            <div key={p.platform} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  {!p.ready && !conn && <Badge variant="outline">Soon</Badge>}
                  {conn && (
                    <Badge variant="default">
                      <Check className="h-3 w-3" /> Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {conn
                    ? `${conn.accountName ?? "Connected"}${conn.lastSyncedAt ? ` · synced ${new Date(conn.lastSyncedAt).toLocaleString()}` : " · not synced yet"}`
                    : p.desc}
                </p>
                {conn?.syncError && <p className="mt-0.5 text-xs text-destructive">Last sync failed.</p>}
              </div>
              <div className="flex items-center gap-2">
                {conn ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => sync.mutate(conn.id)} disabled={sync.isPending}>
                      {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => disconnect.mutate(conn.id)} disabled={disconnect.isPending}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => connect(p.platform)} disabled={!p.ready}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
