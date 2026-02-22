import { StateCreator } from "zustand";

export interface Constraints {
  budgetLevel: "low" | "medium" | "high";
  teamSize: number;
  timeline: "hackathon" | "1month" | "3months" | "production";
  trafficExpectation: "low" | "medium" | "high" | "very_high";
  dataVolume: "small" | "medium" | "large";
  uptimeTarget: number;
  regionCount: number;
  devExperienceGoal: "mvp_speed" | "balanced" | "scale_ready";
  dataSensitivity: "low" | "medium" | "high";
  preferredProviders: string[];
  avoidProviders: string[];
}

export interface ConstraintSlice {
  constraints: Constraints;
  setConstraints: (constraints: Partial<Constraints>) => void;
  resetConstraints: () => void;
}

const DEFAULT_CONSTRAINTS: Constraints = {
  budgetLevel: "medium",
  teamSize: 2,
  timeline: "1month",
  trafficExpectation: "medium",
  dataVolume: "medium",
  uptimeTarget: 99,
  regionCount: 1,
  devExperienceGoal: "balanced",
  dataSensitivity: "low",
  preferredProviders: [],
  avoidProviders: [],
};

export const createConstraintSlice: StateCreator<ConstraintSlice, [], [], ConstraintSlice> = (set) => ({
  constraints: DEFAULT_CONSTRAINTS,
  setConstraints: (partial) =>
    set((state) => ({
      constraints: { ...state.constraints, ...partial },
    })),
  resetConstraints: () => set({ constraints: DEFAULT_CONSTRAINTS }),
});
