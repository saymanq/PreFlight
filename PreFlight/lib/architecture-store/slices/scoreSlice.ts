import { StateCreator } from "zustand";

export interface DimensionScore {
  score: number;
  explanation: string;
  ruleHits: string[];
}

export interface ScoreResult {
  overall: number;
  dimensions: {
    buildSpeed: DimensionScore;
    complexity: DimensionScore;
    scalability: DimensionScore;
    estimatedCost: DimensionScore & { monthlyCost: number };
    opsBurden: DimensionScore;
    lockInRisk: DimensionScore;
    reliability: DimensionScore;
    aiReadiness: DimensionScore;
  };
  constraintViolations: string[];
}

export interface ScoreSlice {
  scores: ScoreResult | null;
  setScores: (scores: ScoreResult) => void;
  clearScores: () => void;
}

export const createScoreSlice: StateCreator<ScoreSlice, [], [], ScoreSlice> = (set) => ({
  scores: null,
  setScores: (scores) => set({ scores }),
  clearScores: () => set({ scores: null }),
});
