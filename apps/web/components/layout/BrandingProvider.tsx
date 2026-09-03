"use client";
import { useEffect } from "react";
import { useWorkspace } from "@/lib/hooks/useWorkspace";
import { useWorkspaceStore } from "@/lib/stores/workspace";
import { useBranding } from "@/lib/hooks/useBranding";

// Applies the workspace's white-label primary color by overriding the `--primary` CSS token
// on the document root (an inline style beats the stylesheet, incl. dark mode). Renders nothing.
// The agency name + logo are read directly by the Sidebar via useBranding.
//
// `--ring` moves with it. The two carry the same value in both themes, so overriding only
// --primary left focus rings painted in the stock brand colour on white-labelled workspaces —
// a visible mismatch on every input the tenant focused.
export function BrandingProvider() {
  const { data: me } = useWorkspace();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceId = activeId ?? me?.data.memberships[0]?.workspaceId ?? null;
  const { data: branding } = useBranding(workspaceId);
  const primaryColor = branding?.data.primaryColor;

  useEffect(() => {
    const root = document.documentElement;
    if (primaryColor) {
      root.style.setProperty("--primary", primaryColor);
      root.style.setProperty("--ring", primaryColor);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
    }
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
    };
  }, [primaryColor]);

  return null;
}
