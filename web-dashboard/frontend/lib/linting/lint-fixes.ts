import { generateId } from "@/lib/utils";
import { COMPONENT_LIBRARY } from "@/lib/components-data";
import type { LintIssue } from "./lint-engine";

interface NewNode {
  componentId: string;
  label: string;
  category: string;
  icon: string;
  color: string;
}

interface NewEdge {
  sourceId: string;
  targetId: string;
}

interface FixResult {
  addNodes?: NewNode[];
  addEdges?: NewEdge[];
  removeEdgeIds?: string[];
  message: string;
}

function findComponent(id: string) {
  for (const cat of COMPONENT_LIBRARY) {
    const comp = cat.components.find((c) => c.id === id);
    if (comp) return { ...comp, category: cat.id };
  }
  return null;
}

function componentNode(id: string): NewNode | null {
  const comp = findComponent(id);
  if (!comp) return null;
  return { componentId: comp.id, label: comp.name, category: comp.category, icon: comp.icon, color: comp.color };
}

function nodesByCategory(nodes: any[], category: string): any[] {
  return nodes.filter((n: any) => (n.data?.category || "") === category);
}

function hasType(nodes: any[], ...ids: string[]): boolean {
  return nodes.some((n: any) => ids.includes(n.data?.componentId || ""));
}

type FixHandler = (issue: LintIssue, nodes: any[], edges: any[]) => FixResult | null;

const FIX_MAP: Record<string, FixHandler> = {

  // S1: No auth → add Clerk, wire: backend→clerk
  S1: (_issue, nodes) => {
    if (hasType(nodes, "clerk", "auth0", "nextauth", "supabase-auth", "firebase-auth", "cognito")) return null;
    const node = componentNode("clerk");
    if (!node) return null;
    const backends = nodesByCategory(nodes, "backend");
    const frontends = nodesByCategory(nodes, "frontend");
    const connectFrom = backends.length > 0 ? backends : frontends;
    return {
      addNodes: [node],
      addEdges: connectFrom.map((src: any) => ({ sourceId: src.id, targetId: `__NEW__clerk` })),
      message: "Added Clerk for authentication and connected to your backend",
    };
  },

  // P1: No cache → add Redis, wire: backend→redis
  P1: (_issue, nodes) => {
    if (hasType(nodes, "redis", "memcached")) return null;
    const node = componentNode("redis");
    if (!node) return null;
    const backends = nodesByCategory(nodes, "backend");
    return {
      addNodes: [node],
      addEdges: backends.map((be: any) => ({ sourceId: be.id, targetId: `__NEW__redis` })),
      message: "Added Redis cache layer and connected to your backend",
    };
  },

  // P3: No CDN → add Cloudflare CDN, wire: cdn→frontend
  P3: (_issue, nodes) => {
    if (hasType(nodes, "cloudflare-cdn", "cloudfront")) return null;
    const node = componentNode("cloudflare-cdn");
    if (!node) return null;
    const frontends = nodesByCategory(nodes, "frontend");
    return {
      addNodes: [node],
      addEdges: frontends.map((fe: any) => ({ sourceId: `__NEW__cloudflare-cdn`, targetId: fe.id })),
      message: "Added Cloudflare CDN for static assets, connected to frontend",
    };
  },

  // P5: No queue for long tasks → add SQS/queue, wire: backend→queue
  P5: (_issue, nodes) => {
    if (hasType(nodes, "sqs", "kafka", "rabbitmq", "pubsub")) return null;
    const node = componentNode("sqs");
    if (!node) return null;
    const backends = nodesByCategory(nodes, "backend");
    const mlNodes = nodesByCategory(nodes, "ml");
    const edges: NewEdge[] = [];
    backends.forEach((be: any) => edges.push({ sourceId: be.id, targetId: `__NEW__sqs` }));
    mlNodes.forEach((ml: any) => edges.push({ sourceId: `__NEW__sqs`, targetId: ml.id }));
    return {
      addNodes: [node],
      addEdges: edges,
      message: "Added SQS queue for async processing, connected between backend and ML",
    };
  },

  // R1: No monitoring → add Sentry, wire: backend→sentry
  R1: (_issue, nodes) => {
    if (hasType(nodes, "sentry", "datadog", "prometheus")) return null;
    const node = componentNode("sentry");
    if (!node) return null;
    const backends = nodesByCategory(nodes, "backend");
    const frontends = nodesByCategory(nodes, "frontend");
    const sources = [...backends, ...frontends];
    return {
      addNodes: [node],
      addEdges: sources.map((src: any) => ({ sourceId: src.id, targetId: `__NEW__sentry` })),
      message: "Added Sentry for error monitoring, connected to frontend and backend",
    };
  },

  // R3: No CI/CD → add GitHub Actions, wire: cicd→hosting
  R3: (_issue, nodes) => {
    if (hasType(nodes, "github-actions", "gitlab-ci", "circleci")) return null;
    const node = componentNode("github-actions");
    if (!node) return null;
    const hosting = nodesByCategory(nodes, "hosting");
    return {
      addNodes: [node],
      addEdges: hosting.map((h: any) => ({ sourceId: `__NEW__github-actions`, targetId: h.id })),
      message: "Added GitHub Actions CI/CD, connected to hosting",
    };
  },

  // ST1: Disconnected component → auto-connect to nearest logical layer
  ST1: (issue, nodes, edges) => {
    const targetNodeId = issue.targets.nodeIds[0];
    if (!targetNodeId) return null;
    const targetNode = nodes.find((n: any) => n.id === targetNodeId);
    if (!targetNode) return null;
    const targetCat = targetNode.data?.category || "";

    const connectionTargets: Record<string, string[]> = {
      frontend: ["backend", "auth", "hosting"],
      backend: ["database", "cache", "ml", "queue"],
      database: ["backend"],
      cache: ["backend"],
      auth: ["backend", "frontend"],
      ml: ["backend", "queue"],
      monitoring: ["backend", "frontend"],
      hosting: ["frontend", "backend"],
      cicd: ["hosting"],
      queue: ["backend"],
      storage: ["backend"],
      search: ["backend"],
    };

    const preferredTargetCats = connectionTargets[targetCat] || [];
    const newEdges: NewEdge[] = [];

    for (const cat of preferredTargetCats) {
      const candidates = nodesByCategory(nodes, cat);
      if (candidates.length > 0) {
        const alreadyConnected = edges.some(
          (e: any) =>
            (e.source === targetNodeId && candidates.some((c: any) => c.id === e.target)) ||
            (e.target === targetNodeId && candidates.some((c: any) => c.id === e.source))
        );
        if (!alreadyConnected) {
          const isSource = ["frontend", "backend", "cicd", "monitoring"].includes(targetCat);
          if (isSource) {
            newEdges.push({ sourceId: targetNodeId, targetId: candidates[0].id });
          } else {
            newEdges.push({ sourceId: candidates[0].id, targetId: targetNodeId });
          }
          break;
        }
      }
    }

    if (newEdges.length === 0) return null;
    return { addEdges: newEdges, message: `Connected ${targetNode.data?.label || "component"} to the architecture` };
  },

  // ST3: Frontend→DB direct → remove edge, add backend in between, rewire
  ST3: (issue, nodes) => {
    if (!issue.targets.edgeIds?.length) return null;
    const hasBE = nodesByCategory(nodes, "backend").length > 0;

    if (hasBE) {
      return {
        removeEdgeIds: issue.targets.edgeIds,
        message: "Removed direct frontend→database edge — route through your backend instead",
      };
    }

    const node = componentNode("fastapi");
    if (!node) return null;
    const frontends = nodesByCategory(nodes, "frontend");
    const databases = nodesByCategory(nodes, "database");
    const newEdges: NewEdge[] = [];
    frontends.forEach((fe: any) => newEdges.push({ sourceId: fe.id, targetId: `__NEW__fastapi` }));
    databases.forEach((db: any) => newEdges.push({ sourceId: `__NEW__fastapi`, targetId: db.id }));

    return {
      addNodes: [node],
      addEdges: newEdges,
      removeEdgeIds: issue.targets.edgeIds,
      message: "Added FastAPI backend between frontend and database, removed direct connection",
    };
  },

  // ST5: No backend → add FastAPI, wire: frontend→fastapi, fastapi→database/auth/etc
  ST5: (_issue, nodes) => {
    if (hasType(nodes, "fastapi", "express", "nestjs", "django", "flask", "go", "spring", "nodejs")) return null;
    const node = componentNode("fastapi");
    if (!node) return null;
    const frontends = nodesByCategory(nodes, "frontend");
    const databases = nodesByCategory(nodes, "database");
    const auths = nodesByCategory(nodes, "auth");
    const caches = nodesByCategory(nodes, "cache");
    const mls = nodesByCategory(nodes, "ml");
    const storages = nodesByCategory(nodes, "storage");
    const newEdges: NewEdge[] = [];
    frontends.forEach((fe: any) => newEdges.push({ sourceId: fe.id, targetId: `__NEW__fastapi` }));
    [...databases, ...auths, ...caches, ...mls, ...storages].forEach((tgt: any) =>
      newEdges.push({ sourceId: `__NEW__fastapi`, targetId: tgt.id })
    );
    return {
      addNodes: [node],
      addEdges: newEdges,
      message: "Added FastAPI backend, connected to frontend and all downstream services",
    };
  },

  // A1: AI called from frontend → add backend if missing, rewire
  A1: (issue, nodes, edges) => {
    const aiNodeId = issue.targets.nodeIds[0];
    if (!aiNodeId) return null;
    const backends = nodesByCategory(nodes, "backend");
    const frontends = nodesByCategory(nodes, "frontend");

    const badEdges = edges.filter(
      (e: any) => e.target === aiNodeId && frontends.some((fe: any) => fe.id === e.source)
    );

    if (backends.length > 0) {
      const beToAiExists = edges.some((e: any) => e.source === backends[0].id && e.target === aiNodeId);
      const newEdges: NewEdge[] = beToAiExists ? [] : [{ sourceId: backends[0].id, targetId: aiNodeId }];
      return {
        removeEdgeIds: badEdges.map((e: any) => e.id),
        addEdges: newEdges,
        message: "Routed AI calls through backend instead of frontend",
      };
    }

    const node = componentNode("fastapi");
    if (!node) return null;
    const newEdges: NewEdge[] = [];
    frontends.forEach((fe: any) => newEdges.push({ sourceId: fe.id, targetId: `__NEW__fastapi` }));
    newEdges.push({ sourceId: `__NEW__fastapi`, targetId: aiNodeId });

    return {
      addNodes: [node],
      addEdges: newEdges,
      removeEdgeIds: badEdges.map((e: any) => e.id),
      message: "Added FastAPI backend to proxy AI calls, removed direct frontend→AI edge",
    };
  },
};

const LAYER_Y: Record<string, number> = {
  frontend: 80, auth: 230, backend: 380, ml: 380,
  queue: 530, cache: 530, database: 680, storage: 680,
  search: 680, monitoring: 830, hosting: 830, cicd: 830,
};

export function canAutoFix(issue: LintIssue): boolean {
  return issue.ruleId in FIX_MAP;
}

export interface AutoFixResult {
  nodes: any[];
  edges: any[];
  message: string;
  addedNodeIds: string[];
  addedEdgeIds: string[];
  removedEdgeIds: string[];
}

export function applyAutoFix(
  issue: LintIssue,
  currentNodes: any[],
  currentEdges: any[]
): AutoFixResult | null {
  const handler = FIX_MAP[issue.ruleId];
  if (!handler) return null;

  const result = handler(issue, currentNodes, currentEdges);
  if (!result) return null;

  let nodes = [...currentNodes];
  let edges = [...currentEdges];

  const newNodeIdMap: Record<string, string> = {};
  const addedNodeIds: string[] = [];
  const addedEdgeIds: string[] = [];
  const removedEdgeIds: string[] = result.removeEdgeIds ? [...result.removeEdgeIds] : [];

  if (result.addNodes) {
    const layerCounters: Record<string, number> = {};
    for (const n of nodes) {
      const cat = n.data?.category || "";
      layerCounters[cat] = (layerCounters[cat] || 0) + 1;
    }

    for (const add of result.addNodes) {
      const y = LAYER_Y[add.category] || 500;
      const xCount = layerCounters[add.category] || 0;
      layerCounters[add.category] = xCount + 1;
      const x = 180 + xCount * 260;
      const newId = `${add.componentId}-${generateId()}`;
      newNodeIdMap[`__NEW__${add.componentId}`] = newId;
      addedNodeIds.push(newId);

      nodes.push({
        id: newId,
        type: "custom",
        position: { x, y },
        data: {
          label: add.label,
          componentId: add.componentId,
          category: add.category,
          icon: add.icon,
          color: add.color,
        },
      });
    }
  }

  if (result.removeEdgeIds) {
    const toRemove = new Set(result.removeEdgeIds);
    edges = edges.filter((e: any) => !toRemove.has(e.id));
  }

  if (result.addEdges) {
    for (const ae of result.addEdges) {
      const sourceId = newNodeIdMap[ae.sourceId] || ae.sourceId;
      const targetId = newNodeIdMap[ae.targetId] || ae.targetId;
      const alreadyExists = edges.some(
        (e: any) => e.source === sourceId && e.target === targetId
      );
      if (!alreadyExists && sourceId !== targetId) {
        const edgeId = generateId();
        addedEdgeIds.push(edgeId);
        edges.push({
          id: edgeId,
          source: sourceId,
          target: targetId,
          type: "custom",
          sourceHandle: "bottom",
          targetHandle: "top",
        });
      }
    }
  }

  return { nodes, edges, message: result.message, addedNodeIds, addedEdgeIds, removedEdgeIds };
}
