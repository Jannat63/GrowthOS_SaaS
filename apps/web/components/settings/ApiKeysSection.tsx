"use client";
import { useState } from "react";
import { Code, Copy, Check, Trash2 } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/lib/hooks/useApiKeys";
import { API_URL } from "@/lib/api/client";
import { UpgradeNotice, useApiAccess } from "./PlanGate";

export function ApiKeysSection({ workspaceId }: { workspaceId: string | null }) {
  const { data, isLoading } = useApiKeys(workspaceId);
  const create = useCreateApiKey(workspaceId);
  const revoke = useRevokeApiKey(workspaceId);
  const unlocked = useApiAccess(workspaceId);
  const [name, setName] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    const key = await create.mutateAsync(name.trim());
    setJustCreated(key.plaintext);
    setName("");
  }

  async function copyKey() {
    if (!justCreated) return;
    await navigator.clipboard.writeText(justCreated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const keys = data?.data.filter((k) => !k.revokedAt) ?? [];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">API keys</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Read access to your recommendations, keyword rankings, and weekly report from your own
        scripts or tools like Zapier.{" "}
        <a href={`${API_URL}/api/public/v1/docs`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
          View API docs
        </a>
        .
      </p>

      {justCreated && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">Copy this key now — it won&apos;t be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-xs">{justCreated}</code>
            <Button variant="outline" size="sm" onClick={copyKey}>
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {/* The gate is stated before the form, not after the request fails. */}
      {!unlocked ? (
        <UpgradeNotice what="API keys" />
      ) : (
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Key name, e.g. Zapier"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button disabled={!name.trim() || create.isPending} onClick={handleCreate}>
            {create.isPending ? "Creating…" : "Create key"}
          </Button>
        </div>
      )}
      {create.isError && (
        <p className="mt-2 text-sm text-destructive">
          {create.error instanceof Error ? create.error.message : "Could not create the key."}
        </p>
      )}

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active API keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{k.keyPrefix}…</code>
                    {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(k.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
