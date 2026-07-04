"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { detectFatigueAll, CreativePerformance, FatigueResult } from "@/lib/logic/creative-fatigue";
import { creatives as mockCreatives } from "@/lib/mock-data/meta-ads";

export function useCreativeFatigue(creatives: CreativePerformance[] = mockCreatives) {
  return useQuery<{ data: FatigueResult[]; source: "live" | "mock" }>({
    queryKey: ["creative-fatigue", creatives],
    queryFn: async () => {
      try {
        const data = await api.post<FatigueResult[]>("/api/meta-ads/creative-fatigue", creatives);
        return { data, source: "live" as const };
      } catch {
        return { data: detectFatigueAll(creatives), source: "mock" as const };
      }
    },
  });
}
