"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BrandGuidelines } from "@growthos/logic";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

// Workspace brand guidelines (M4 · P4.2a-1).
//
// The mock fallback is the UNCONFIGURED brand, not a demo brand with invented banned terms: with no
// backend the honest answer is "no constraints are known", and showing a fabricated set of a
// customer's own brand rules would be worse than showing none.
export type BrandGuidelinesView = BrandGuidelines & { configured: boolean };

export const UNCONFIGURED_BRAND: BrandGuidelinesView = {
  tone: "professional",
  bannedTerms: [],
  requiredDisclaimers: [],
  valueProps: [],
  targetPersona: null,
  readingLevel: null,
  configured: false,
};

export function useBrandGuidelines(workspaceId: string | null | undefined) {
  return useQuery<{ data: BrandGuidelinesView; source: "live" | "mock" }>({
    queryKey: ["brand-guidelines", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ guidelines: BrandGuidelinesView }>(
              `/workspaces/${workspaceId}/brand-guidelines`
            )
          ).guidelines,
        () => UNCONFIGURED_BRAND
      ),
  });
}

export function useBrandGuidelinesActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (guidelines: Partial<BrandGuidelines>) =>
      api.put(`/workspaces/${workspaceId}/brand-guidelines`, guidelines),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-guidelines", workspaceId] });
    },
  });
}
