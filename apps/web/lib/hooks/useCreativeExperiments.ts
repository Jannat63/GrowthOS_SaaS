"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExperimentResult, ExperimentStatus, ExperimentWinner } from "@growthos/logic";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/**
 * Creative variant experiments (M4 · P4.2a-3) — an experiment log.
 *
 * The LIST is a read, so it keeps the `liveOrMock` fallback. Its offline value is an **empty list**,
 * not invented experiments: these are records of what a real person decided to test, and fabricating
 * one would put words in their mouth. An empty log offline is honest; a populated one is fiction.
 *
 * Every WRITE is a plain mutation with no fallback, matching the other action hooks.
 */
export interface CreativeExperiment {
  id: string;
  hypothesis: string;
  variantA: unknown;
  variantB: unknown;
  variantALabel: string;
  variantBLabel: string;
  successMetric: string;
  status: ExperimentStatus;
  result: ExperimentResult | null;
  startedAt: string | null;
  concludedAt: string | null;
  createdAt: string;
}

export function useCreativeExperiments(workspaceId: string | null | undefined) {
  return useQuery<{ data: CreativeExperiment[]; source: "live" | "mock" }>({
    queryKey: ["creative-experiments", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () =>
      liveOrMock(
        async () =>
          (
            await api.get<{ data: CreativeExperiment[]; total: number }>(
              `/workspaces/${workspaceId}/creative-experiments`
            )
          ).data,
        () => []
      ),
  });
}

export interface CreateExperimentBody {
  hypothesis: string;
  variantA: unknown;
  variantB: unknown;
  variantALabel?: string;
  variantBLabel?: string;
  successMetric: string;
}

export interface ConcludeBody {
  winner: ExperimentWinner;
  notes?: string;
  metricA?: number;
  metricB?: number;
}

export function useCreativeExperimentActions(workspaceId: string | null | undefined) {
  const qc = useQueryClient();
  const base = `/workspaces/${workspaceId}/creative-experiments`;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["creative-experiments", workspaceId] });
  };

  const create = useMutation({
    mutationFn: (body: CreateExperimentBody) => api.post(base, body),
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ExperimentStatus }) =>
      api.patch(`${base}/${id}/status`, { status }),
    onSuccess: invalidate,
  });

  const conclude = useMutation({
    mutationFn: ({ id, ...body }: ConcludeBody & { id: string }) =>
      api.post(`${base}/${id}/conclude`, body),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`${base}/${id}`),
    onSuccess: invalidate,
  });

  return { create, setStatus, conclude, remove };
}
