"use client";
import { useState } from "react";
import { UserPlus, Trash2, Mail, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@growthos/ui/components/card";
import { Badge } from "@growthos/ui/components/badge";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Skeleton } from "@growthos/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@growthos/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@growthos/ui/components/dropdown-menu";
import type { Role } from "@growthos/types";
import { useMembers } from "@/lib/hooks/useMembers";
import {
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
} from "@/lib/hooks/useInvitations";
import { DataSourceBadge } from "@/components/dashboard/DataSourceBadge";

const ROLE_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  owner: "default",
  admin: "default",
  manager: "muted",
  viewer: "outline",
  client: "outline",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "outline"> = {
  pending: "outline",
  accepted: "success",
  revoked: "warning",
  expired: "muted",
};

// All five app roles are offered here; the API is the actual enforcement point — an admin
// picking "owner" from this list still gets a 403 from POST .../invitations (see guards.ts's
// rankOf), so there's nothing unsafe about not filtering the list client-side too.
const INVITABLE_ROLES: Role[] = ["client", "viewer", "manager", "admin", "owner"];

export function TeamSection({
  workspaceId,
  isAdmin,
}: {
  workspaceId: string | null;
  isAdmin: boolean;
}) {
  const { data: members } = useMembers(workspaceId);
  // Only fetched for admins — GET .../invitations is admin-gated on the API, so a non-admin
  // query here would just be a guaranteed 403.
  const { data: invitations, isLoading: invitesLoading } = useInvitations(
    isAdmin ? workspaceId : null
  );
  const create = useCreateInvitation(workspaceId);
  const revoke = useRevokeInvitation(workspaceId);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");

  async function handleInvite() {
    if (!email.trim()) return;
    try {
      await create.mutateAsync({ email: email.trim(), role });
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
      setRole("viewer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the invitation.");
    }
  }

  async function handleRevoke(invitationId: string) {
    try {
      await revoke.mutateAsync(invitationId);
      toast.success("Invitation revoked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke the invitation.");
    }
  }

  // Revoked/accepted invitations already show up elsewhere (accepted → the member row above,
  // revoked → nothing left to act on) — this list is specifically what still needs attention.
  const outstanding = (invitations?.data ?? []).filter(
    (i) => i.status === "pending" || i.status === "expired"
  );

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-semibold tracking-tight">Team</h2>
        {members && <DataSourceBadge source={members.source} />}
      </div>

      <div className="mt-4">
        {members ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[m.role] ?? "outline"} className="capitalize">
                      {m.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Skeleton className="h-32 w-full" />
        )}
      </div>

      {isAdmin && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium">Invite someone</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-xs"
            />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {role}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {INVITABLE_ROLES.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => setRole(r)}
                    className="flex items-center justify-between gap-4 capitalize"
                  >
                    {r}
                    {r === role && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button disabled={!email.trim() || create.isPending} onClick={handleInvite}>
              <UserPlus className="h-3.5 w-3.5" />
              {create.isPending ? "Sending…" : "Send invite"}
            </Button>
          </div>

          <div className="mt-4">
            {invitesLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : outstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <ul className="space-y-2">
                {outstanding.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited as <span className="capitalize">{inv.role}</span>
                          {inv.status === "expired"
                            ? " · expired"
                            : ` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[inv.status] ?? "outline"} className="capitalize">
                        {inv.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revoke.isPending}
                        onClick={() => handleRevoke(inv.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
