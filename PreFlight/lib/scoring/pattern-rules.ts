import { getProviderForComponent } from "./component-weights";

interface GraphNode {
  id: string;
  type: string;
  category: string;
  config?: Record<string, any>;
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

export interface PatternRule {
  id: string;
  check: (graph: { nodes: GraphNode[]; edges: GraphEdge[] }, constraints: Constraints) => boolean;
  adjustments: Partial<Record<string, number>>;
  explanation: string;
}

export const PATTERN_RULES: PatternRule[] = [
  // ── BUILD SPEED ──
  {
    id: "too-many-services",
    check: (g) => g.nodes.length > 8,
    adjustments: { buildSpeed: -2, complexity: 2 },
    explanation: "Large number of services increases build time and complexity",
  },
  {
    id: "minimal-stack",
    check: (g) => g.nodes.length <= 4 && g.nodes.length > 0,
    adjustments: { buildSpeed: 2, complexity: -1 },
    explanation: "Minimal stack enables rapid development",
  },
  {
    id: "overkill-for-mvp",
    check: (g, c) => c.timeline === "hackathon" && g.nodes.length > 6,
    adjustments: { buildSpeed: -3 },
    explanation: "Too many services for a hackathon timeline",
  },

  // ── SCALABILITY ──
  {
    id: "no-cache-read-heavy",
    check: (g) => {
      const hasDB = g.nodes.some((n) => n.category === "database");
      const hasCache = g.nodes.some((n) => n.category === "cache");
      return hasDB && !hasCache && g.nodes.length > 3;
    },
    adjustments: { scalability: -3 },
    explanation: "Architecture without caching will bottleneck at scale",
  },
  {
    id: "has-queue",
    check: (g) => g.nodes.some((n) => n.category === "queue"),
    adjustments: { scalability: 2, reliability: 1 },
    explanation: "Message queue enables async processing and fault tolerance",
  },
  {
    id: "single-db-multi-backend",
    check: (g) => {
      const dbs = g.nodes.filter((n) => n.category === "database");
      const backends = g.nodes.filter((n) => n.category === "backend");
      return dbs.length === 1 && backends.length > 1;
    },
    adjustments: { scalability: -2 },
    explanation: "Multiple backends sharing a single database creates a bottleneck",
  },

  // ── RELIABILITY ──
  {
    id: "no-monitoring",
    check: (g) => g.nodes.length > 2 && !g.nodes.some((n) => n.category === "monitoring"),
    adjustments: { reliability: -2 },
    explanation: "No monitoring means you won't know when things break",
  },
  {
    id: "single-region-high-uptime",
    check: (_, c) => c.regionCount <= 1 && c.uptimeTarget >= 99.9,
    adjustments: { reliability: -3 },
    explanation: "99.9%+ uptime is extremely difficult with single-region deployment",
  },

  // ── COST ──
  {
    id: "llm-in-sync-path",
    check: (g) => {
      const aiNodes = g.nodes.filter((n) => n.category === "ml");
      return aiNodes.some((ai) => {
        const incoming = g.edges.filter((e) => e.target === ai.id);
        return incoming.some((e) => e.syncAsync === "sync" || !e.syncAsync);
      });
    },
    adjustments: { cost: 20, scalability: -1 },
    explanation: "Synchronous LLM calls on request path increases cost and latency",
  },

  // ── OPS BURDEN ──
  {
    id: "all-serverless",
    check: (g) => {
      const backends = g.nodes.filter((n) => n.category === "backend");
      if (backends.length === 0) return false;
      const serverlessTypes = new Set(["vercel", "cloudrun", "netlify", "railway", "render"]);
      return backends.every((b) => serverlessTypes.has(b.type));
    },
    adjustments: { opsBurden: -3 },
    explanation: "Fully serverless/managed stack = minimal ops burden",
  },

  // ── AI READINESS ──
  {
    id: "has-vector-capable",
    check: (g) => g.nodes.some((n) => ["mongodb", "supabase", "postgresql"].includes(n.type) || n.category === "search"),
    adjustments: { aiReadiness: 1 },
    explanation: "Database supports vector search for RAG patterns",
  },
  {
    id: "no-async-for-ai",
    check: (g) => {
      const hasAI = g.nodes.some((n) => n.category === "ml");
      const hasQueue = g.nodes.some((n) => n.category === "queue");
      return hasAI && !hasQueue;
    },
    adjustments: { aiReadiness: -2 },
    explanation: "AI features without async processing risk timeouts",
  },

  // ── LOCK-IN ──
  {
    id: "multi-cloud",
    check: (g) => {
      const providers = new Set(g.nodes.map((n) => getProviderForComponent(n.type)));
      providers.delete("self-managed");
      return providers.size >= 3;
    },
    adjustments: { lockIn: -2 },
    explanation: "Multi-provider architecture reduces vendor lock-in",
  },
  {
    id: "single-vendor",
    check: (g) => {
      const providers = new Set(g.nodes.map((n) => getProviderForComponent(n.type)));
      providers.delete("self-managed");
      return providers.size === 1 && g.nodes.length > 2;
    },
    adjustments: { lockIn: 3 },
    explanation: "Single-vendor stack maximizes lock-in risk",
  },
];
