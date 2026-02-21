import { type ArchNode, type ArchEdge } from "./store";
import { getComponentByType } from "./component-catalog";

interface ScoreResult {
    score: number;
    explanation: string;
    ruleHits: string[];
}

type ScoreMap = Record<string, ScoreResult>;

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

function baseScore(nodes: ArchNode[]): Record<string, number> {
    const totals: Record<string, number> = {
        buildSpeed: 5,
        complexity: 5,
        scalability: 5,
        opsBurden: 5,
        cost: 5,
        lockIn: 5,
        reliability: 5,
        aiReadiness: 5,
    };

    for (const node of nodes) {
        const def = getComponentByType(node.data.type);
        if (!def) continue;
        const w = def.baseWeights;
        totals.buildSpeed += w.buildSpeed;
        totals.complexity += w.complexity;
        totals.scalability += w.scalability;
        totals.opsBurden += w.opsBurden;
        totals.cost += w.cost;
        totals.lockIn += w.lockIn;
        totals.reliability += w.reliability;
        totals.aiReadiness += w.aiReadiness;
    }

    return totals;
}

function patternAdjustments(
    nodes: ArchNode[],
    edges: ArchEdge[]
): { adjustments: Record<string, number>; hits: string[] } {
    const adjustments: Record<string, number> = {};
    const hits: string[] = [];
    const types = new Set(nodes.map((n) => n.data.type));
    const hasTag = (tag: string) => nodes.some((n) => n.data.tags?.includes(tag));

    // LLM in architecture without queue → cost/latency risk
    const hasLLM = hasTag("llm");
    const hasAsyncBuffer =
        types.has("queue") || types.has("event_bus") || types.has("workflow_orchestrator");
    if (hasLLM && !hasAsyncBuffer) {
        adjustments.cost = (adjustments.cost ?? 0) + 1;
        adjustments.reliability = (adjustments.reliability ?? 0) - 1;
        hits.push("LLM without queue: potential cost and latency risk");
    }

    // No cache for read-heavy (many data connections)
    const dataEdges = edges.filter((e) => {
        const target = nodes.find((n) => n.id === e.target);
        return target?.data.category === "data";
    });
    const hasRuntimeCache =
        types.has("redis") || types.has("upstash_redis") || hasTag("cache_layer");
    if (dataEdges.length > 3 && !hasRuntimeCache) {
        adjustments.scalability = (adjustments.scalability ?? 0) - 1;
        hits.push("Multiple data connections without cache layer");
    }

    // Multiple services → complexity increase
    if (nodes.length > 8) {
        adjustments.complexity = (adjustments.complexity ?? 0) + 2;
        adjustments.opsBurden = (adjustments.opsBurden ?? 0) + 1;
        hits.push("Complex architecture with many components");
    }

    // Has monitoring → reliability bonus
    const hasObservability = nodes.some(
        (n) =>
            n.data.category === "observability" ||
            n.data.type === "monitoring" ||
            n.data.type === "analytics" ||
            n.data.type === "error_tracking" ||
            n.data.type === "logging_stack" ||
            n.data.type === "tracing"
    );
    if (hasObservability) {
        adjustments.reliability = (adjustments.reliability ?? 0) + 1;
        hits.push("Monitoring present: reliability improved");
    }

    // Has CDN → scalability bonus
    const hasCDN = types.has("cdn") || hasTag("cdn_edge");
    if (hasCDN) {
        adjustments.scalability = (adjustments.scalability ?? 0) + 1;
        hits.push("CDN present: scalability improved");
    }

    return { adjustments, hits };
}

function constraintAdjustments(
    totals: Record<string, number>,
    constraints: Record<string, string>
): { adjustments: Record<string, number>; hits: string[] } {
    const adjustments: Record<string, number> = {};
    const hits: string[] = [];

    if (constraints.timeline === "hackathon") {
        // Heavily favor build speed, penalize complexity
        if (totals.complexity > 6) {
            adjustments.buildSpeed = (adjustments.buildSpeed ?? 0) - 2;
            hits.push("High complexity is risky for hackathon timeline");
        }
    }

    if (constraints.budgetLevel === "low") {
        if (totals.cost > 6) {
            adjustments.cost = (adjustments.cost ?? 0) + 1;
            hits.push("Architecture cost may exceed low budget target");
        }
    }

    if (constraints.trafficExpectation === "high") {
        if (totals.scalability < 6) {
            adjustments.scalability = (adjustments.scalability ?? 0) - 1;
            hits.push("Scalability may be insufficient for high traffic");
        }
    }

    if (constraints.dataSensitivity === "high") {
        if (totals.reliability < 6) {
            adjustments.reliability = (adjustments.reliability ?? 0) - 1;
            hits.push("Reliability should be higher for sensitive data");
        }
    }

    return { adjustments, hits };
}

export function runScoring(
    nodes: ArchNode[],
    edges: ArchEdge[],
    constraints: Record<string, string>
): ScoreMap {
    if (nodes.length === 0) return {};

    const totals = baseScore(nodes);
    const patterns = patternAdjustments(nodes, edges);
    const constraintAdj = constraintAdjustments(totals, constraints);

    const dimensions = [
        "buildSpeed",
        "complexity",
        "scalability",
        "opsBurden",
        "cost",
        "lockIn",
        "reliability",
        "aiReadiness",
    ];

    const result: ScoreMap = {};

    for (const dim of dimensions) {
        const raw =
            totals[dim] + (patterns.adjustments[dim] ?? 0) + (constraintAdj.adjustments[dim] ?? 0);
        const score = clamp(Math.round(raw), 1, 10);

        // Invert "bad" dimensions so higher = better
        const invertedDims = ["complexity", "opsBurden", "cost", "lockIn"];
        const displayScore = invertedDims.includes(dim) ? clamp(11 - score, 1, 10) : score;

        const allHits = [
            ...patterns.hits.filter((h) => h.toLowerCase().includes(dim.toLowerCase().replace(/([A-Z])/g, " $1"))),
            ...constraintAdj.hits,
        ];

        const explanations: Record<string, string> = {
            buildSpeed: displayScore >= 7 ? "Fast to build with chosen stack" : displayScore >= 4 ? "Moderate build time expected" : "Complex stack may slow development",
            complexity: displayScore >= 7 ? "Architecture is simple and manageable" : displayScore >= 4 ? "Moderate complexity" : "High complexity — consider simplifying",
            scalability: displayScore >= 7 ? "Well-positioned for growth" : displayScore >= 4 ? "Can handle moderate scale" : "May need scaling improvements",
            opsBurden: displayScore >= 7 ? "Low operational overhead" : displayScore >= 4 ? "Some operational work required" : "High ops burden — consider managed services",
            cost: displayScore >= 7 ? "Cost-efficient architecture" : displayScore >= 4 ? "Moderate costs expected" : "High cost profile — review component choices",
            lockIn: displayScore >= 7 ? "Low vendor lock-in" : displayScore >= 4 ? "Some vendor dependencies" : "High lock-in risk — consider alternatives",
            reliability: displayScore >= 7 ? "Reliable architecture design" : displayScore >= 4 ? "Reasonable reliability" : "Reliability concerns — add redundancy",
            aiReadiness: displayScore >= 7 ? "Well-equipped for AI features" : displayScore >= 4 ? "Basic AI capability" : "Limited AI infrastructure",
        };

        result[dim] = {
            score: displayScore,
            explanation: explanations[dim] ?? "",
            ruleHits: allHits,
        };
    }

    return result;
}
