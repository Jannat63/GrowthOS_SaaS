import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Client state: whether the dashboard rail is collapsed. Persisted across sessions. */
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (value) => set({ collapsed: value }),
    }),
    { name: "growthos-sidebar" }
  )
);
