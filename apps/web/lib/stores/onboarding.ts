import { create } from "zustand";

export type OnboardingState = {
  businessName: string;
  websiteUrl: string;
  category: string;
  monthlyBudget: string;
  connected: string[];
  update: (partial: Partial<Omit<OnboardingState, "update" | "toggleChannel">>) => void;
  toggleChannel: (id: string) => void;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  businessName: "",
  websiteUrl: "",
  category: "",
  monthlyBudget: "",
  connected: [],
  update: (partial) => set(partial),
  toggleChannel: (id) =>
    set((state) => ({
      connected: state.connected.includes(id)
        ? state.connected.filter((c) => c !== id)
        : [...state.connected, id],
    })),
}));
