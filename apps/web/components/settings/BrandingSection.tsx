"use client";
import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Card } from "@growthos/ui/components/card";
import { Button } from "@growthos/ui/components/button";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { Skeleton } from "@growthos/ui/components/skeleton";
import { useBranding, useBrandingActions } from "@/lib/hooks/useBranding";

const DEFAULT_PRIMARY = "#4f46e5";
const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

export function BrandingSection({ workspaceId }: { workspaceId: string | null }) {
  const { data: branding } = useBranding(workspaceId);
  const save = useBrandingActions(workspaceId);

  const [agencyName, setAgencyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");

  // Seed the form once branding loads.
  useEffect(() => {
    if (!branding) return;
    setAgencyName(branding.data.agencyName ?? "");
    setLogoUrl(branding.data.logoUrl ?? "");
    setPrimaryColor(branding.data.primaryColor ?? "");
  }, [branding]);

  const colorValid = primaryColor === "" || isHex(primaryColor);

  function onSave() {
    save.mutate({
      agencyName: agencyName.trim() || null,
      logoUrl: logoUrl.trim() || null,
      primaryColor: primaryColor.trim() || null,
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold tracking-tight">Branding</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        White-label the app for your agency — name, logo, and accent color.
      </p>

      {!branding ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : (
        <div className="mt-4 grid max-w-xl gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="agencyName">Agency name</Label>
            <Input
              id="agencyName"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="GrowthOS"
              maxLength={60}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              type="url"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="primaryColor">Accent color</Label>
            <div className="flex items-center gap-3">
              <input
                aria-label="Pick accent color"
                type="color"
                value={isHex(primaryColor) ? primaryColor : DEFAULT_PRIMARY}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background"
              />
              <Input
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder={DEFAULT_PRIMARY}
                className="max-w-[160px] font-mono"
              />
              {!colorValid && (
                <span className="text-xs text-destructive">Use a 6-digit hex, e.g. #4f46e5.</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={save.isPending || !colorValid}>
              {save.isPending ? "Saving…" : "Save branding"}
            </Button>
            {save.isSuccess && !save.isPending && (
              <span className="text-sm text-success">Saved.</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
