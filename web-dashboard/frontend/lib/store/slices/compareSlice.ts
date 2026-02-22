import { StateCreator } from "zustand";

export interface CompareVariant {
  id: string;
  strategyId: string;
  strategyName: string;
  nodes: any[];
  edges: any[];
  scores: any;
  lintIssues: any[];
  monthlyCost: number;
}

export interface CompareSlice {
  compareMode: boolean;
  variants: CompareVariant[];
  setCompareMode: (active: boolean) => void;
  setVariants: (variants: CompareVariant[]) => void;
  clearVariants: () => void;
}

export const createCompareSlice: StateCreator<CompareSlice, [], [], CompareSlice> = (set) => ({
  compareMode: false,
  variants: [],
  setCompareMode: (active) => set({ compareMode: active }),
  setVariants: (variants) => set({ variants }),
  clearVariants: () => set({ variants: [], compareMode: false }),
});
