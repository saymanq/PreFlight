interface GraphNode { id: string; type: string; category: string; config?: Record<string, any>; data?: any }
interface GraphEdge { id: string; source: string; target: string; relationship?: string; syncAsync?: string }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

export function buildAdjacencyMap(graph: Graph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) adj.get(edge.source)?.push(edge.target);
  return adj;
}

export function detectCycles(adj: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);
    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, path);
      } else if (recStack.has(neighbor)) {
        const start = path.indexOf(neighbor);
        if (start >= 0) cycles.push(path.slice(start));
      }
    }
    path.pop();
    recStack.delete(node);
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) dfs(node, []);
  }
  return cycles;
}

export function getProvider(type: string): string {
  const map: Record<string, string> = {
    vercel: "vercel", nextjs: "vercel", "vercel-deploy": "vercel",
    "aws-ec2": "aws", s3: "aws", sqs: "aws", amazondynamodb: "aws", cloudfront: "aws", cognito: "aws",
    "gcp-compute": "gcp", cloudrun: "gcp", pubsub: "gcp", gcs: "gcp",
    "azure-vm": "azure", "azure-blob": "azure",
    "cloudflare-cdn": "cloudflare", "cloudflare-r2": "cloudflare",
    supabase: "supabase", "supabase-auth": "supabase", "supabase-storage": "supabase",
    firebase: "google", "firebase-auth": "google",
    openai: "openai", anthropic: "anthropic",
    clerk: "clerk", auth0: "auth0", sentry: "sentry", datadog: "datadog",
    mongodb: "mongodb",
  };
  return map[type] || "other";
}

export function getLanguage(type: string): string | null {
  const map: Record<string, string> = {
    fastapi: "Python", django: "Python", flask: "Python",
    express: "TypeScript", nestjs: "TypeScript", nextjs: "TypeScript", nodejs: "TypeScript",
    go: "Go", spring: "Java",
  };
  return map[type] || null;
}

export function normalizeNodeType(node: GraphNode): string {
  return node.data?.componentId || node.type || "";
}

export function normalizeNodeCategory(node: GraphNode): string {
  return node.data?.category || node.category || "";
}
