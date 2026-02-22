import { ALL_LINT_RULES, type LintTarget } from "./lint-rules";
import { normalizeNodeType, normalizeNodeCategory } from "./graph-utils";

interface GNode { id: string; type: string; category: string; config?: Record<string, any>; data?: any }
interface GEdge { id: string; source: string; target: string; relationship?: string; syncAsync?: string }

export interface LintIssue {
  ruleId: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  category: string;
  targets: LintTarget;
  suggestedFix?: string;
  autoFixable: boolean;
}

interface Constraints {
  budgetLevel: string;
  teamSize: number;
  timeline: string;
  trafficExpectation: string;
  uptimeTarget: number;
  regionCount: number;
  dataSensitivity: string;
  [k: string]: any;
}

function normalizeGraph(nodes: GNode[], edges: GEdge[]) {
  return {
    nodes: nodes.map((n) => ({
      ...n,
      type: normalizeNodeType(n),
      category: normalizeNodeCategory(n),
    })),
    edges,
  };
}

export function runLinter(
  rawNodes: GNode[],
  edges: GEdge[],
  constraints: Constraints
): LintIssue[] {
  const graph = normalizeGraph(rawNodes, edges);
  const issues: LintIssue[] = [];

  for (const rule of ALL_LINT_RULES) {
    try {
      const targets = rule.predicate(graph, constraints);
      for (const target of targets) {
        issues.push({
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.title,
          description: target.message,
          category: rule.category,
          targets: target,
          suggestedFix: rule.suggestedFix,
          autoFixable: rule.autoFixable ?? false,
        });
      }
    } catch {
      // Skip rules that error out
    }
  }

  const order = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  return issues;
}
