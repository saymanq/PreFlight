import { COMPONENT_WEIGHTS, getProviderForComponent } from "../scoring/component-weights";

interface GNode { id: string; type: string; category: string; data?: any }
interface Constraints {
  budgetLevel: string;
  teamSize: number;
  timeline: string;
  trafficExpectation: string;
  uptimeTarget: number;
  regionCount: number;
  dataSensitivity: string;
  preferredProviders: string[];
  avoidProviders: string[];
  [k: string]: any;
}

export interface ConstraintViolation {
  constraintId: string;
  severity: "hard" | "soft";
  message: string;
  suggestedAction: string;
}

function nodeType(n: GNode): string {
  return n.data?.componentId || n.type || "";
}

export function checkConstraintViolations(
  nodes: GNode[],
  constraints: Constraints,
  scores?: { dimensions?: { estimatedCost?: { monthlyCost?: number }; buildSpeed?: { score?: number } } }
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const monthlyCost = scores?.dimensions?.estimatedCost?.monthlyCost ?? 0;
  const buildSpeed = scores?.dimensions?.buildSpeed?.score ?? 10;

  if (constraints.budgetLevel === "low" && monthlyCost > 50) {
    violations.push({
      constraintId: "budget",
      severity: "hard",
      message: `Estimated $${monthlyCost}/mo exceeds low budget target ($50)`,
      suggestedAction: "Remove optional services or switch to cheaper alternatives",
    });
  }

  if (constraints.timeline === "hackathon" && buildSpeed < 6) {
    violations.push({
      constraintId: "timeline",
      severity: "hard",
      message: "Architecture complexity too high for hackathon timeline",
      suggestedAction: "Reduce to 4-5 core services, prefer managed/serverless",
    });
  }

  if (constraints.teamSize === 1 && nodes.length > 6) {
    violations.push({
      constraintId: "team",
      severity: "soft",
      message: "Too many services for a solo developer",
      suggestedAction: "Consolidate services or choose managed alternatives",
    });
  }

  for (const preferred of constraints.preferredProviders) {
    if (!nodes.some((n) => getProviderForComponent(nodeType(n)) === preferred)) {
      violations.push({
        constraintId: `prefer_${preferred}`,
        severity: "soft",
        message: `Preferred provider "${preferred}" not used`,
        suggestedAction: `Consider adding a ${preferred} service`,
      });
    }
  }

  for (const avoided of constraints.avoidProviders) {
    const found = nodes.filter((n) => getProviderForComponent(nodeType(n)) === avoided);
    if (found.length > 0) {
      violations.push({
        constraintId: `avoid_${avoided}`,
        severity: "hard",
        message: `"${avoided}" is in your avoid list but used in architecture`,
        suggestedAction: `Replace ${found.map((n) => n.data?.label || nodeType(n)).join(", ")} with alternatives`,
      });
    }
  }

  return violations;
}
