export function explainDimension(
  dimension: string,
  score: number,
  ruleHits: string[]
): string {
  const hitText = ruleHits.length > 0 ? " " + ruleHits.join(" ") : "";

  const templates: Record<string, (s: number) => string> = {
    buildSpeed: (s) => {
      if (s >= 8) return "Minimal services and managed tooling enable rapid development.";
      if (s >= 5) return "Moderate service count balances features with development speed.";
      return "High service count will slow initial development.";
    },
    complexity: (s) => {
      if (s >= 8) return "Simple architecture with few moving parts.";
      if (s >= 5) return "Moderate complexity -- manageable for a small team.";
      return "Complex architecture with many interconnected services.";
    },
    scalability: (s) => {
      if (s >= 8) return "Well-positioned for 10x-100x traffic growth.";
      if (s >= 5) return "Can handle moderate growth with some refactoring.";
      return "Will likely need architectural changes to scale.";
    },
    estimatedCost: (s) => {
      if (s >= 8) return "Low infrastructure cost at current scale.";
      if (s >= 5) return "Moderate infrastructure spend.";
      return "High monthly infrastructure cost -- consider cheaper alternatives.";
    },
    opsBurden: (s) => {
      if (s >= 8) return "Serverless/managed -- minimal operational maintenance.";
      if (s >= 5) return "Some operational work required for updates and monitoring.";
      return "Significant DevOps effort needed for this stack.";
    },
    lockInRisk: (s) => {
      if (s >= 8) return "Portable stack with minimal vendor lock-in.";
      if (s >= 5) return "Some vendor-specific patterns, but migration is feasible.";
      return "Heavily locked into specific vendors -- migration would be costly.";
    },
    reliability: (s) => {
      if (s >= 8) return "Strong fault tolerance and data safety.";
      if (s >= 5) return "Good for current scale but gaps at higher load.";
      return "Reliability risks -- consider monitoring and redundancy.";
    },
    aiReadiness: (s) => {
      if (s >= 8) return "Well-equipped for AI/ML features (vector search, async pipelines).";
      if (s >= 5) return "Can support basic AI features with some additions.";
      return "Would need significant changes to support AI features.";
    },
  };

  const base = templates[dimension]?.(score) ?? `Score: ${score}/10`;
  return base + hitText;
}
