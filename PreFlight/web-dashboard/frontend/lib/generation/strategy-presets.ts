export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  modifiers: {
    maxNodes: number;
    preferServerless: boolean;
    includeOptionalCategories: boolean;
    cachePriority: "skip" | "optional" | "required";
    queuePriority: "skip" | "optional" | "required";
    monitoringPriority: "skip" | "optional" | "required";
  };
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "mvp_speed",
    name: "Lightning MVP",
    description: "Minimum viable architecture. Ship in hours, not days.",
    modifiers: {
      maxNodes: 5,
      preferServerless: true,
      includeOptionalCategories: false,
      cachePriority: "skip",
      queuePriority: "skip",
      monitoringPriority: "skip",
    },
  },
  {
    id: "balanced",
    name: "Balanced Build",
    description: "Good foundation with room to grow.",
    modifiers: {
      maxNodes: 8,
      preferServerless: true,
      includeOptionalCategories: true,
      cachePriority: "optional",
      queuePriority: "optional",
      monitoringPriority: "optional",
    },
  },
  {
    id: "scale_first",
    name: "Scale-Ready",
    description: "Built for growth. Handles 10x without redesign.",
    modifiers: {
      maxNodes: 12,
      preferServerless: true,
      includeOptionalCategories: true,
      cachePriority: "required",
      queuePriority: "required",
      monitoringPriority: "required",
    },
  },
  {
    id: "budget_first",
    name: "Budget Optimized",
    description: "Maximum capability at minimum cost.",
    modifiers: {
      maxNodes: 6,
      preferServerless: true,
      includeOptionalCategories: false,
      cachePriority: "skip",
      queuePriority: "skip",
      monitoringPriority: "skip",
    },
  },
];
