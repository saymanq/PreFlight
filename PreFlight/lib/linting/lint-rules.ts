import { buildAdjacencyMap, detectCycles, getLanguage, normalizeNodeType, normalizeNodeCategory } from "./graph-utils";
import { COMPONENT_WEIGHTS } from "../scoring/component-weights";

interface GNode { id: string; type: string; category: string; config?: Record<string, any>; data?: any }
interface GEdge { id: string; source: string; target: string; relationship?: string; syncAsync?: string }
interface Graph { nodes: GNode[]; edges: GEdge[] }
interface Constraints { budgetLevel: string; teamSize: number; timeline: string; trafficExpectation: string; uptimeTarget: number; regionCount: number; dataSensitivity: string; [k: string]: any }

export interface LintTarget { nodeIds: string[]; edgeIds?: string[]; message: string }

export interface LintRule {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  category: "security" | "performance" | "reliability" | "cost" | "dx" | "ai" | "structural";
  predicate: (graph: Graph, constraints: Constraints) => LintTarget[];
  suggestedFix?: string;
  autoFixable?: boolean;
}

function n(node: GNode) { return { type: normalizeNodeType(node), category: normalizeNodeCategory(node) }; }

export const ALL_LINT_RULES: LintRule[] = [
  // ── SECURITY ──
  { id: "S1", severity: "error", title: "No authentication for user-facing app", category: "security",
    predicate: (g) => {
      const hasFE = g.nodes.some((x) => n(x).category === "frontend");
      const hasAuth = g.nodes.some((x) => n(x).category === "auth");
      const hasDB = g.nodes.some((x) => n(x).category === "database");
      if (hasFE && hasDB && !hasAuth) return [{ nodeIds: g.nodes.filter((x) => n(x).category === "database").map((x) => x.id), message: "Add authentication to protect user data" }];
      return [];
    }, suggestedFix: "Add an auth provider (Clerk, Auth0, or NextAuth)", autoFixable: true },

  { id: "S2", severity: "warning", title: "No rate limiting on public API", category: "security",
    predicate: (g) => {
      const backends = g.nodes.filter((x) => n(x).category === "backend");
      const hasFE = g.nodes.some((x) => n(x).category === "frontend");
      if (hasFE && backends.length > 0 && !backends.some((b) => b.config?.rateLimiting)) return [{ nodeIds: backends.map((b) => b.id), message: "API endpoints exposed without rate limiting" }];
      return [];
    }, suggestedFix: "Add rate limiting middleware" },

  { id: "S3", severity: "error", title: "High-sensitivity data without encryption", category: "security",
    predicate: (g, c) => {
      if (c.dataSensitivity !== "high") return [];
      const dbs = g.nodes.filter((x) => n(x).category === "database").filter((d) => !d.config?.encryptionAtRest);
      return dbs.map((d) => ({ nodeIds: [d.id], message: "Enable encryption at rest for sensitive data" }));
    }, suggestedFix: "Enable encryption at rest" },

  { id: "S4", severity: "warning", title: "No HTTPS/TLS mentioned", category: "security",
    predicate: (g) => {
      if (g.nodes.length < 3) return [];
      const hasHosting = g.nodes.some((x) => ["vercel", "netlify", "cloudrun", "railway", "render"].includes(n(x).type));
      if (!hasHosting) return [{ nodeIds: [], message: "Ensure TLS/HTTPS for all public endpoints" }];
      return [];
    } },

  // ── PERFORMANCE ──
  { id: "P1", severity: "warning", title: "No caching layer", category: "performance",
    predicate: (g) => {
      const hasDB = g.nodes.some((x) => n(x).category === "database");
      const hasCache = g.nodes.some((x) => n(x).category === "cache");
      if (hasDB && !hasCache && g.nodes.length > 3) return [{ nodeIds: g.nodes.filter((x) => n(x).category === "database").map((x) => x.id), message: "No caching layer detected -- reads may bottleneck" }];
      return [];
    }, suggestedFix: "Add Redis or CDN caching", autoFixable: true },

  { id: "P2", severity: "error", title: "LLM in synchronous request path", category: "performance",
    predicate: (g) => {
      const aiNodes = g.nodes.filter((x) => n(x).category === "ml");
      const issues: LintTarget[] = [];
      for (const ai of aiNodes) {
        const incoming = g.edges.filter((e) => e.target === ai.id && (e.syncAsync === "sync" || !e.syncAsync));
        if (incoming.length > 0) issues.push({ nodeIds: [ai.id], edgeIds: incoming.map((e) => e.id), message: "LLM calls are slow (1-30s). Use async path." });
      }
      return issues;
    }, suggestedFix: "Add queue or background action for LLM calls" },

  { id: "P3", severity: "info", title: "No CDN for static assets", category: "performance",
    predicate: (g) => {
      const hasFE = g.nodes.some((x) => n(x).category === "frontend");
      const hasCDN = g.nodes.some((x) => ["cloudflare-cdn", "cloudfront"].includes(n(x).type));
      const hasVercel = g.nodes.some((x) => n(x).type === "vercel");
      if (hasFE && !hasCDN && !hasVercel) return [{ nodeIds: [], message: "Consider a CDN for static assets" }];
      return [];
    }, suggestedFix: "Add Cloudflare CDN for edge caching", autoFixable: true },

  { id: "P4", severity: "warning", title: "Database without connection pooling", category: "performance",
    predicate: (g, c) => {
      if (c.trafficExpectation === "low") return [];
      const dbs = g.nodes.filter((x) => ["postgresql", "mysql"].includes(n(x).type)).filter((d) => !d.config?.connectionPooling);
      return dbs.map((d) => ({ nodeIds: [d.id], message: "Connection pooling recommended for medium+ traffic" }));
    } },

  { id: "P5", severity: "warning", title: "Long-running task without queue", category: "performance",
    predicate: (g) => {
      const hasAI = g.nodes.some((x) => n(x).category === "ml");
      const hasUpload = g.edges.some((e) => e.relationship === "uploads_to");
      const hasQueue = g.nodes.some((x) => n(x).category === "queue");
      if ((hasAI || hasUpload) && !hasQueue) return [{ nodeIds: [], message: "Long-running tasks need async processing" }];
      return [];
    }, suggestedFix: "Add SQS or message queue for async tasks", autoFixable: true },

  // ── RELIABILITY ──
  { id: "R1", severity: "warning", title: "No monitoring or observability", category: "reliability",
    predicate: (g) => {
      if (g.nodes.length < 3) return [];
      if (!g.nodes.some((x) => n(x).category === "monitoring")) return [{ nodeIds: [], message: "Add monitoring to detect issues" }];
      return [];
    }, suggestedFix: "Add Sentry or Prometheus", autoFixable: true },

  { id: "R2", severity: "error", title: "Single region with high uptime target", category: "reliability",
    predicate: (_, c) => {
      if (c.regionCount <= 1 && c.uptimeTarget >= 99.9) return [{ nodeIds: [], message: "99.9%+ uptime requires multi-region deployment" }];
      return [];
    } },

  { id: "R3", severity: "info", title: "No CI/CD pipeline", category: "reliability",
    predicate: (g) => {
      if (g.nodes.length < 3) return [];
      if (!g.nodes.some((x) => n(x).category === "cicd")) return [{ nodeIds: [], message: "CI/CD ensures safe deployments" }];
      return [];
    }, suggestedFix: "Add GitHub Actions for automated deployment", autoFixable: true },

  { id: "R4", severity: "warning", title: "No backup strategy", category: "reliability",
    predicate: (g, c) => {
      if (c.timeline === "hackathon") return [];
      const db = g.nodes.find((x) => n(x).category === "database");
      if (db && !db.config?.backupEnabled) return [{ nodeIds: [db.id], message: "Primary database should have automated backups" }];
      return [];
    } },

  { id: "R5", severity: "warning", title: "No error handling strategy", category: "reliability",
    predicate: (g) => {
      const hasBackend = g.nodes.some((x) => n(x).category === "backend");
      const hasMonitoring = g.nodes.some((x) => n(x).category === "monitoring");
      const hasQueue = g.nodes.some((x) => n(x).category === "queue");
      if (hasBackend && !hasMonitoring && !hasQueue && g.nodes.length > 4) return [{ nodeIds: [], message: "No visible error handling or retry strategy" }];
      return [];
    } },

  // ── AI ──
  { id: "A1", severity: "error", title: "AI called directly from frontend", category: "ai",
    predicate: (g) => {
      const aiNodes = g.nodes.filter((x) => n(x).category === "ml");
      const issues: LintTarget[] = [];
      for (const ai of aiNodes) {
        const fromFE = g.edges.some((e) => e.target === ai.id && g.nodes.some((x) => x.id === e.source && n(x).category === "frontend"));
        if (fromFE) issues.push({ nodeIds: [ai.id], message: "AI provider should be called from backend, not frontend" });
      }
      return issues;
    }, suggestedFix: "Route AI calls through backend API", autoFixable: true },

  { id: "A2", severity: "warning", title: "Vector search without embeddings", category: "ai",
    predicate: (g) => {
      const hasSearch = g.nodes.some((x) => n(x).category === "search" || x.config?.vectorSearch);
      const hasAI = g.nodes.some((x) => n(x).category === "ml");
      if (hasSearch && !hasAI) return [{ nodeIds: g.nodes.filter((x) => n(x).category === "search").map((x) => x.id), message: "Vector search needs an embeddings provider" }];
      return [];
    } },

  { id: "A3", severity: "info", title: "No fallback AI model", category: "ai",
    predicate: (g) => {
      const aiNodes = g.nodes.filter((x) => n(x).category === "ml");
      if (aiNodes.length === 1) return [{ nodeIds: [aiNodes[0].id], message: "Consider a fallback model for reliability" }];
      return [];
    } },

  { id: "A4", severity: "warning", title: "Expensive model on hot path", category: "ai",
    predicate: (g, c) => {
      if (c.trafficExpectation === "low") return [];
      const expensive = g.nodes.filter((x) => n(x).category === "ml" && x.config?.model && ["gpt-4", "gpt-4-turbo", "claude-3-opus"].includes(x.config.model));
      return expensive.map((x) => ({ nodeIds: [x.id], message: `${x.config?.model} is expensive at scale` }));
    } },

  // ── STRUCTURAL ──
  { id: "ST1", severity: "warning", title: "Disconnected component", category: "structural",
    predicate: (g) => {
      if (g.nodes.length <= 1) return [];
      const connected = new Set<string>();
      for (const e of g.edges) { connected.add(e.source); connected.add(e.target); }
      const disconnected = g.nodes.filter((x) => !connected.has(x.id));
      return disconnected.map((x) => ({ nodeIds: [x.id], message: `${n(x).type || "Component"} is not connected to anything` }));
    }, suggestedFix: "Auto-connect to nearest logical layer", autoFixable: true },

  { id: "ST2", severity: "info", title: "Duplicate component role", category: "structural",
    predicate: (g) => {
      const cats = g.nodes.map((x) => n(x).category).filter(Boolean);
      const dupes = [...new Set(cats.filter((c, i) => cats.indexOf(c) !== i))];
      return dupes.map((cat) => ({ nodeIds: g.nodes.filter((x) => n(x).category === cat).map((x) => x.id), message: `Multiple ${cat} services -- intentional?` }));
    } },

  { id: "ST3", severity: "error", title: "Frontend directly accessing database", category: "structural",
    predicate: (g) => {
      const issues: LintTarget[] = [];
      for (const e of g.edges) {
        const src = g.nodes.find((x) => x.id === e.source);
        const tgt = g.nodes.find((x) => x.id === e.target);
        if (src && tgt && n(src).category === "frontend" && n(tgt).category === "database") {
          issues.push({ edgeIds: [e.id], nodeIds: [src.id, tgt.id], message: "Frontend should not directly access database" });
        }
      }
      return issues;
    }, suggestedFix: "Route through a backend API layer", autoFixable: true },

  { id: "ST4", severity: "warning", title: "Circular dependency", category: "structural",
    predicate: (g) => {
      const adj = buildAdjacencyMap(g);
      const cycles = detectCycles(adj);
      return cycles.map((c) => ({ nodeIds: c, message: "Circular dependency between services" }));
    } },

  { id: "ST5", severity: "info", title: "No backend layer", category: "structural",
    predicate: (g) => {
      const hasFE = g.nodes.some((x) => n(x).category === "frontend");
      const hasBE = g.nodes.some((x) => n(x).category === "backend");
      if (hasFE && !hasBE && g.nodes.length > 1) return [{ nodeIds: [], message: "No backend layer -- consider adding one for security and business logic" }];
      return [];
    }, suggestedFix: "Add a backend (FastAPI, Express) between frontend and services", autoFixable: true },

  // ── COST ──
  { id: "C1", severity: "warning", title: "Architecture cost exceeds budget", category: "cost",
    predicate: (g, c) => {
      if (c.budgetLevel !== "low") return [];
      const total = g.nodes.reduce((sum, x) => sum + (COMPONENT_WEIGHTS[n(x).type]?.cost || 0), 0);
      if (total > 50) return [{ nodeIds: [], message: `~$${total}/mo exceeds low-budget target` }];
      return [];
    } },

  { id: "C2", severity: "info", title: "Potentially redundant paid services", category: "cost",
    predicate: (g) => {
      const hasSupabase = g.nodes.some((x) => n(x).type === "supabase");
      const hasSeparateAuth = g.nodes.some((x) => ["auth0", "clerk"].includes(n(x).type));
      if (hasSupabase && hasSeparateAuth) return [{ nodeIds: g.nodes.filter((x) => ["supabase", "auth0", "clerk"].includes(n(x).type)).map((x) => x.id), message: "Supabase includes auth -- separate auth service may be redundant" }];
      return [];
    } },

  { id: "C3", severity: "warning", title: "Over-provisioned for current scale", category: "cost",
    predicate: (g, c) => {
      if (c.trafficExpectation !== "low") return [];
      const enterprise = g.nodes.filter((x) => ["kafka", "elasticsearch", "datadog", "aws-ec2"].includes(n(x).type));
      return enterprise.map((x) => ({ nodeIds: [x.id], message: `${n(x).type} is enterprise-grade -- overkill for low traffic` }));
    } },

  // ── DX ──
  { id: "DX1", severity: "info", title: "Multiple programming languages", category: "dx",
    predicate: (g, c) => {
      if (c.teamSize >= 4) return [];
      const langs = new Set<string>();
      for (const x of g.nodes) { const l = getLanguage(n(x).type); if (l) langs.add(l); }
      if (langs.size > 2) return [{ nodeIds: [], message: `Uses ${[...langs].join(", ")} -- consider consolidating for small team` }];
      return [];
    } },

  { id: "DX2", severity: "warning", title: "Complex stack for solo dev", category: "dx",
    predicate: (g, c) => {
      if (c.teamSize > 1) return [];
      if (g.nodes.length > 6) return [{ nodeIds: [], message: "7+ services is challenging for one person" }];
      return [];
    } },

  { id: "DX3", severity: "info", title: "Consider type-safe stack", category: "dx",
    predicate: (g) => {
      const langs = new Set<string>();
      for (const x of g.nodes) { const l = getLanguage(n(x).type); if (l) langs.add(l); }
      if (langs.has("Python") && langs.has("TypeScript")) return [{ nodeIds: [], message: "Mixed Python/TS stack -- consider using TypeScript everywhere for type safety" }];
      return [];
    } },
];
