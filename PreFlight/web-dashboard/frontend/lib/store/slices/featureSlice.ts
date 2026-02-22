import { StateCreator } from "zustand";

export interface FeaturePlan {
  id: string;
  name: string;
  category: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "draft" | "planned" | "in_progress" | "exported";
  dependencies: string[];
  acceptanceCriteria: string[];
  architectureDiff?: {
    nodesToAdd: { type: string; category: string }[];
    edgesToAdd: { sourceType: string; targetType: string; relationship: string }[];
  };
  scoreDelta?: Record<string, number>;
  order: number;
}

export interface FeatureSlice {
  features: FeaturePlan[];
  selectedFeatureId: string | null;
  addFeature: (feature: FeaturePlan) => void;
  updateFeature: (id: string, updates: Partial<FeaturePlan>) => void;
  removeFeature: (id: string) => void;
  reorderFeatures: (ids: string[]) => void;
  selectFeature: (id: string | null) => void;
  setFeatures: (features: FeaturePlan[]) => void;
}

export const createFeatureSlice: StateCreator<FeatureSlice, [], [], FeatureSlice> = (set) => ({
  features: [],
  selectedFeatureId: null,
  addFeature: (feature) =>
    set((state) => ({ features: [...state.features, feature] })),
  updateFeature: (id, updates) =>
    set((state) => ({
      features: state.features.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  removeFeature: (id) =>
    set((state) => ({ features: state.features.filter((f) => f.id !== id) })),
  reorderFeatures: (ids) =>
    set((state) => {
      const map = new Map(state.features.map((f) => [f.id, f]));
      return { features: ids.map((id, i) => ({ ...map.get(id)!, order: i })) };
    }),
  selectFeature: (id) => set({ selectedFeatureId: id }),
  setFeatures: (features) => set({ features }),
});
