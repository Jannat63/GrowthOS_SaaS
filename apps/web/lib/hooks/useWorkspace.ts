"use client";
import { useQuery } from "@tanstack/react-query";
import type { MeResponse } from "@growthos/types";
import { api } from "@/lib/api/client";
import { liveOrMock } from "./liveOrMock";

/** Fallback identity so the dashboard renders even without a reachable backend. */
const MOCK_ME: MeResponse = {
  user: { id: "mock-user", email: "you@growthos.dev", name: "You" },
  memberships: [
    {
      workspaceId: "mock-ws",
      role: "owner",
      workspace: {
        id: "mock-ws",
        name: "Demo Workspace",
        slug: "demo-workspace",
        plan: "starter",
        onboardingComplete: true,
      },
    },
  ],
};

/** LIVE: current user + workspace memberships from `/api/v1/auth/me`. */
export function useWorkspace() {
  return useQuery<{ data: MeResponse; source: "live" | "mock" }>({
    queryKey: ["me"],
    queryFn: () => liveOrMock(() => api.get<MeResponse>("/auth/me"), () => MOCK_ME),
  });
}
