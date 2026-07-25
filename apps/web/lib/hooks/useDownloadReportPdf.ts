"use client";
import { useMutation } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Not built on lib/api/client.ts's `request()` — that helper always calls `.json()`, which can't
// handle a binary PDF response. Downloading a real, user-triggered file also isn't a candidate
// for the live/mock fallback pattern the rest of this app's data hooks use (same reasoning as
// useCheckout/usePortal) — if it fails, the person needs to know, not see a fake success.
export function useDownloadReportPdf(workspaceId: string | null | undefined) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/workspaces/${workspaceId}/reports/pdf`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Could not generate the report (${res.status}).`);
      }
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "weekly-report.pdf";
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}
