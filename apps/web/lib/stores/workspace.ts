import { create } from "zustand";

/** Client state: which workspace the dashboard is currently viewing. */
interface WorkspaceState {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId: null,
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
}));
