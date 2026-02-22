import { COMPONENT_WEIGHTS, type ScoreWeights } from "./component-weights";
import { PATTERN_RULES } from "./pattern-rules";
import { explainDimension } from "./explanation-templates";

interface GraphNode {
  id: string;
  type: string;
  category: string;
  config?: Record<string, any>;
  data?: { componentId?: string; category?: string };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship?: string;
  syncAsync?: "sync" | "async";
}

interface Constraints {
  budgetLevel: string;
  teamSize: number;
  timeline: string;
  trafficExpectation: string;
  dataVolume: string;
  uptimeTarget: number;
  regionCount: number;
  devExperienceGoal: string;
  dataSensitivity: string;
  preferredProviders: string[];
  avoidProviders: string[];
}

interface DimensionScore {
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

function normalizeNode(n: GraphNode): GraphNode {
  return {
    id: n.id,
    type: n.data?.componentId || n.type || "",
    category: n.data?.category || n.category || "",
    config: n.config,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, value)) * 10) / 10;
}

export function scoreArchitecture(
  rawNodes: GraphNode[],
  edges: GraphEdge[],
  constraints: Constraints
): ScoreResult {
  const nodes = rawNodes.map(normalizeNode);

  if (nodes.length === 0) {
    const emptyDim: DimensionScore = { score: 5, explanation: "Add components to see scores.", ruleHits: [] };
    return {
      overall: 5,
      dimensions: {
        buildSpeed: { ...emptyDim },
        complexity: { ...emptyDim },
        scalability: { ...emptyDim },
        estimatedCost: { ...emptyDim, monthlyCost: 0 },
        opsBurden: { ...emptyDim },
        lockInRisk: { ...emptyDim },
        reliability: { ...emptyDim },
        aiReadiness: { ...emptyDim },
      },
      constraintViolations: [],
    };
  }

  // Step 1: Aggregate base weights
  const raw = { buildSpeed: 0, complexity: 0, scalability: 0, cost: 0, opsBurden: 0, lockIn: 0, reliability: 0, aiReadiness: 0 };
  let counted = 0;

  for (const node of nodes) {
    const w = COMPONENT_WEIGHTS[node.type];
    if (!w) continue;
    counted++;
    raw.buildSpeed += w.buildSpeed;
    raw.complexity += w.complexity;
    raw.scalability += w.scalability;
    raw.cost += w.cost;
    raw.opsBurden += w.opsBurden;
    raw.lockIn += w.lockIn;
    raw.reliability += w.reliability;
    raw.aiReadiness += w.aiReadiness;
  }

  if (counted > 0) {
    raw.buildSpeed /= counted;
    raw.complexity /= counted;
    raw.scalability /= counted;
    raw.opsBurden /= counted;
    raw.lockIn /= counted;
    raw.reliability /= counted;
    raw.aiReadiness /= counted;
  }

  const monthlyCost = raw.cost;

  // Step 2: Apply pattern adjustments
  const ruleHitsMap: Record<string, string[]> = {
    buildSpeed: [], complexity: [], scalability: [], cost: [], opsBurden: [], lockIn: [], reliability: [], aiReadiness: [],
  };

  for (const rule of PATTERN_RULES) {
    if (rule.check({ nodes, edges }, constraints)) {
      for (const [dim, adj] of Object.entries(rule.adjustments)) {
        (raw as any)[dim] += adj as number;
        ruleHitsMap[dim]?.push(rule.explanation);
      }
    }
  }

  // Step 3: Constraint-aware modifiers
  if (constraints.timeline === "hackathon") {
    raw.buildSpeed *= 1.4;
    raw.scalability *= 0.7;
  } else if (constraints.timeline === "production") {
    raw.reliability *= 1.3;
    raw.scalability *= 1.2;
    raw.buildSpeed *= 0.8;
  }

  if (constraints.budgetLevel === "low") raw.cost *= 1.5;
  if (constraints.teamSize === 1) {
    raw.opsBurden *= 1.4;
    raw.complexity *= 1.3;
  }
  if (constraints.trafficExpectation === "very_high") raw.scalability *= 1.4;

  // Step 4: Normalize
  const normalized = {
    buildSpeed: clamp(raw.buildSpeed, 1, 10),
    complexity: clamp(10 - raw.complexity, 1, 10),
    scalability: clamp(raw.scalability, 1, 10),
    estimatedCost: clamp(10 - monthlyCost / 20, 1, 10),
    opsBurden: clamp(10 - raw.opsBurden, 1, 10),
    lockInRisk: clamp(10 - raw.lockIn, 1, 10),
    reliability: clamp(raw.reliability, 1, 10),
    aiReadiness: clamp(raw.aiReadiness, 1, 10),
  };

  // Step 5: Generate explanations
  const dimensions = {
    buildSpeed: { score: normalized.buildSpeed, explanation: explainDimension("buildSpeed", normalized.buildSpeed, ruleHitsMap.buildSpeed), ruleHits: ruleHitsMap.buildSpeed },
    complexity: { score: normalized.complexity, explanation: explainDimension("complexity", normalized.complexity, ruleHitsMap.complexity), ruleHits: ruleHitsMap.complexity },
    scalability: { score: normalized.scalability, explanation: explainDimension("scalability", normalized.scalability, ruleHitsMap.scalability), ruleHits: ruleHitsMap.scalability },
    estimatedCost: { score: normalized.estimatedCost, explanation: explainDimension("estimatedCost", normalized.estimatedCost, ruleHitsMap.cost), ruleHits: ruleHitsMap.cost, monthlyCost },
    opsBurden: { score: normalized.opsBurden, explanation: explainDimension("opsBurden", normalized.opsBurden, ruleHitsMap.opsBurden), ruleHits: ruleHitsMap.opsBurden },
    lockInRisk: { score: normalized.lockInRisk, explanation: explainDimension("lockInRisk", normalized.lockInRisk, ruleHitsMap.lockIn), ruleHits: ruleHitsMap.lockIn },
    reliability: { score: normalized.reliability, explanation: explainDimension("reliability", normalized.reliability, ruleHitsMap.reliability), ruleHits: ruleHitsMap.reliability },
    aiReadiness: { score: normalized.aiReadiness, explanation: explainDimension("aiReadiness", normalized.aiReadiness, ruleHitsMap.aiReadiness), ruleHits: ruleHitsMap.aiReadiness },
  };

  // Step 6: Overall score (weighted by goal)
  const weights = getWeightsForGoal(constraints.devExperienceGoal);
  let total = 0;
  let wSum = 0;
  for (const [dim, w] of Object.entries(weights)) {
    const dimKey = dim as keyof typeof normalized;
    if (dimKey in normalized) {
      total += normalized[dimKey] * w;
      wSum += w;
    }
  }
  const overall = wSum > 0 ? Math.round((total / wSum) * 10) / 10 : 5;

  // Constraint violations
  const violations: string[] = [];
  if (constraints.budgetLevel === "low" && monthlyCost > 50) {
    violations.push(`Estimated $${monthlyCost}/mo exceeds low budget target`);
  }
  if (constraints.timeline === "hackathon" && normalized.buildSpeed < 6) {
    violations.push("Architecture complexity too high for hackathon timeline");
  }
  if (constraints.teamSize === 1 && nodes.length > 6) {
    violations.push("Too many services for a solo developer");
  }

  return { overall, dimensions, constraintViolations: violations };
}

function getWeightsForGoal(goal: string): Record<string, number> {
  switch (goal) {
    case "mvp_speed":
      return { buildSpeed: 3, complexity: 2, scalability: 0.5, estimatedCost: 1.5, opsBurden: 2, lockInRisk: 0.5, reliability: 1, aiReadiness: 1 };
    case "scale_ready":
      return { buildSpeed: 1, complexity: 1, scalability: 3, estimatedCost: 1, opsBurden: 1.5, lockInRisk: 1.5, reliability: 2, aiReadiness: 1 };
    case "balanced":
    default:
      return { buildSpeed: 1.5, complexity: 1.5, scalability: 1.5, estimatedCost: 1.5, opsBurden: 1.5, lockInRisk: 1, reliability: 1.5, aiReadiness: 1 };
  }
}
