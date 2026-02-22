import { generateObject } from "ai";
import { z } from "zod";
import { COMPONENT_LIBRARY } from "@/lib/components-data";
import {
  FAST_OUTPUT_TOKENS,
  getPrimaryTextModel,
  LOW_REASONING_PROVIDER_OPTIONS,
} from "@/lib/ai/azure-openai";

const ARTIFACT_MARKER_REGEX = /<pf_artifact>([\s\S]*?)<\/pf_artifact>/i;
const MAX_GENERATION_ATTEMPTS = 3;
const GENERATION_TOKEN_BUDGETS = [
  FAST_OUTPUT_TOKENS.architectureGenerate,
  5200,
  8200,
] as const;

const COMPONENT_META_BY_ID = new Map(
  COMPONENT_LIBRARY.flatMap((category) =>
    category.components.map((component) => [
      component.id,
      {
        id: component.id,
        label: component.name,
        icon: component.icon,
        color: component.color,
        category: category.id,
      },
    ])
  )
);

const VALID_COMPONENT_IDS = new Set(COMPONENT_META_BY_ID.keys());
const CATEGORY_ORDER = [
  "frontend",
  "auth",
  "backend",
  "api",
  "ai",
  "database",
  "storage",
  "search",
  "realtime",
  "messaging",
  "payments",
  "monitoring",
  "hosting",
  "cicd",
  "mobile",
  "desktop",
  "cms",
  "testing",
  "blockchain",
  "iot",
  "gaming",
];

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

const artifactSchema = z.object({
  ideaSummary: nullableString,
  mustHaveFeatures: z.array(z.string()),
  niceToHaveFeatures: z.array(z.string()),
  openQuestions: z.array(z.string()),
  constraints: z.object({
    budgetLevel: nullableString,
    teamSize: nullableNumber,
    timeline: nullableString,
    trafficExpectation: nullableString,
    dataSensitivity: nullableString,
    regionCount: nullableNumber,
    uptimeTarget: nullableNumber,
    devExperienceGoal: nullableString,
  }),
});

const architectureSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: nullableString,
        componentId: z.string().describe("Must be one of the known component ids"),
      })
    )
    .min(4)
    .max(14),
  edges: z
    .array(
      z.object({
        id: nullableString,
        source: z.string().describe("Use node id or component id"),
        target: z.string().describe("Use node id or component id"),
        relationshipType: z
          .string()
          .max(24)
          .nullable()
          .describe("Short label like invokes/reads/writes/auth/hosts/deploys"),
        protocol: z
          .string()
          .max(20)
          .nullable()
          .describe("Short label like http/https/rpc/sql/ws/s3/event/none"),
      })
    )
    .max(22),
  rationale: z.string().max(280),
  assumptions: z.array(z.string().max(120)).max(4),
});

type GeneratedNode = {
  id: string;
  type: "custom";
  position: { x: number; y: number };
  data: {
    label: string;
    componentId: string;
    category: string;
    icon: string;
    color: string;
  };
};

type GeneratedEdge = {
  id: string;
  source: string;
  target: string;
  type: "custom";
  sourceHandle: "bottom";
  targetHandle: "top";
  animated: true;
  data: {
    relationshipType: string;
    protocol: string;
  };
};

type GraphBuildDiagnostics = {
  modelEdgesRaw: number;
  modelEdgesResolved: number;
  usedHeuristicBootstrap: boolean;
  disconnectedComponentsBeforeRepair: number;
  isolatedNodesBeforeRepair: number;
  repairEdgesAdded: number;
  disconnectedComponentsAfterRepair: number;
  isolatedNodesAfterRepair: number;
};

function uniqueValidComponentIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => String(value).trim().toLowerCase())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index)
    .filter((value) => VALID_COMPONENT_IDS.has(value));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function categoryRank(category: string): number {
  const idx = CATEGORY_ORDER.indexOf(category);
  return idx >= 0 ? idx : CATEGORY_ORDER.length + 1;
}

function buildHeuristicEdges(nodes: GeneratedNode[]): GeneratedEdge[] {
  const edges: GeneratedEdge[] = [];
  const byCategory = (category: string) => nodes.filter((node) => node.data.category === category);
  const pushEdge = (
    sourceNode: GeneratedNode,
    targetNode: GeneratedNode,
    relationshipType: string,
    protocol = "RPC"
  ) => {
    if (sourceNode.id === targetNode.id) return;
    if (edges.some((edge) => edge.source === sourceNode.id && edge.target === targetNode.id)) return;
    edges.push({
      id: `edge-${edges.length + 1}`,
      source: sourceNode.id,
      target: targetNode.id,
      type: "custom",
      sourceHandle: "bottom",
      targetHandle: "top",
      animated: true,
      data: { relationshipType, protocol },
    });
  };

  for (const fe of byCategory("frontend")) {
    for (const be of byCategory("backend")) pushEdge(fe, be, "invokes", "HTTP");
    for (const auth of byCategory("auth")) pushEdge(fe, auth, "authenticates", "HTTP");
    for (const hosting of byCategory("hosting")) pushEdge(fe, hosting, "hosts", "HTTPS");
    for (const monitoring of byCategory("monitoring")) pushEdge(fe, monitoring, "reports", "HTTPS");
  }
  for (const be of byCategory("backend")) {
    for (const db of byCategory("database")) pushEdge(be, db, "reads/writes", "RPC");
    for (const api of byCategory("api")) pushEdge(be, api, "uses", "RPC");
    for (const ai of byCategory("ai")) pushEdge(be, ai, "invokes", "HTTP");
    for (const queue of byCategory("messaging")) pushEdge(be, queue, "queues", "RPC");
    for (const cache of byCategory("realtime")) pushEdge(be, cache, "publishes", "WebSocket");
    for (const storage of byCategory("storage")) pushEdge(be, storage, "stores", "HTTP");
    for (const search of byCategory("search")) pushEdge(be, search, "queries", "HTTP");
    for (const payments of byCategory("payments")) pushEdge(be, payments, "charges", "HTTPS");
    for (const monitoring of byCategory("monitoring")) pushEdge(be, monitoring, "reports", "HTTPS");
  }
  for (const cicd of byCategory("cicd")) {
    for (const hosting of byCategory("hosting")) pushEdge(cicd, hosting, "deploys", "CI");
  }

  return edges;
}

function buildAdjacency(
  nodes: GeneratedNode[],
  edges: GeneratedEdge[]
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) adjacency.set(node.id, new Set<string>());
  for (const edge of edges) {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) continue;
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  return adjacency;
}

function getConnectedComponents(nodes: GeneratedNode[], edges: GeneratedEdge[]): string[][] {
  const adjacency = buildAdjacency(nodes, edges);
  const seen = new Set<string>();
  const components: string[][] = [];

  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    const queue = [node.id];
    const component: string[] = [];
    seen.add(node.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      for (const neighbor of neighbors) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }

    components.push(component);
  }

  return components;
}

function countIsolatedNodes(nodes: GeneratedNode[], edges: GeneratedEdge[]): number {
  const adjacency = buildAdjacency(nodes, edges);
  let isolated = 0;
  for (const node of nodes) {
    if ((adjacency.get(node.id)?.size ?? 0) === 0) isolated += 1;
  }
  return isolated;
}

function componentAnchorScore(category: string): number {
  const idx = CATEGORY_ORDER.indexOf(category);
  return idx >= 0 ? CATEGORY_ORDER.length - idx : 0;
}

function pickAnchorNode(
  ids: string[],
  nodeById: Map<string, GeneratedNode>
): GeneratedNode | null {
  const nodes = ids
    .map((id) => nodeById.get(id))
    .filter((node): node is GeneratedNode => Boolean(node));
  if (nodes.length === 0) return null;
  return nodes
    .slice()
    .sort((a, b) => componentAnchorScore(b.data.category) - componentAnchorScore(a.data.category))[0];
}

function hasUndirectedEdge(
  edges: GeneratedEdge[],
  a: string,
  b: string
): boolean {
  return edges.some(
    (edge) =>
      (edge.source === a && edge.target === b) ||
      (edge.source === b && edge.target === a)
  );
}

function relationForPair(
  sourceCategory: string,
  targetCategory: string
): { relationshipType: string; protocol: string } {
  if (sourceCategory === "frontend" && targetCategory === "backend") {
    return { relationshipType: "invokes", protocol: "HTTP" };
  }
  if (sourceCategory === "frontend" && targetCategory === "auth") {
    return { relationshipType: "authenticates", protocol: "HTTPS" };
  }
  if (sourceCategory === "frontend" && targetCategory === "hosting") {
    return { relationshipType: "hosts", protocol: "HTTPS" };
  }
  if (sourceCategory === "backend" && targetCategory === "database") {
    return { relationshipType: "reads/writes", protocol: "SQL" };
  }
  if (sourceCategory === "backend" && targetCategory === "storage") {
    return { relationshipType: "stores", protocol: "HTTPS" };
  }
  if (sourceCategory === "backend" && targetCategory === "search") {
    return { relationshipType: "queries", protocol: "HTTP" };
  }
  if (sourceCategory === "backend" && targetCategory === "payments") {
    return { relationshipType: "charges", protocol: "HTTPS" };
  }
  if (sourceCategory === "backend" && targetCategory === "monitoring") {
    return { relationshipType: "reports", protocol: "HTTPS" };
  }
  if (sourceCategory === "cicd" && targetCategory === "hosting") {
    return { relationshipType: "deploys", protocol: "CI" };
  }
  return { relationshipType: "links", protocol: "RPC" };
}

function chooseDirection(
  partner: GeneratedNode,
  anchor: GeneratedNode
): { source: GeneratedNode; target: GeneratedNode } {
  if (anchor.data.category === "frontend") {
    return { source: anchor, target: partner };
  }
  if (anchor.data.category === "backend") {
    if (partner.data.category === "frontend") {
      return { source: partner, target: anchor };
    }
    return { source: anchor, target: partner };
  }
  if (anchor.data.category === "cicd") {
    return { source: anchor, target: partner };
  }
  return { source: partner, target: anchor };
}

function choosePartnerFromRoot(
  rootIds: Set<string>,
  nodeById: Map<string, GeneratedNode>,
  anchorCategory: string
): GeneratedNode | null {
  const rootNodes = [...rootIds]
    .map((id) => nodeById.get(id))
    .filter((node): node is GeneratedNode => Boolean(node));
  if (rootNodes.length === 0) return null;

  const byCategory = (category: string) =>
    rootNodes.find((node) => node.data.category === category) ?? null;

  if (anchorCategory === "frontend") {
    return byCategory("backend") ?? byCategory("api") ?? rootNodes[0];
  }
  if (anchorCategory === "backend") {
    return byCategory("frontend") ?? byCategory("hosting") ?? rootNodes[0];
  }
  if (anchorCategory === "cicd") {
    return byCategory("hosting") ?? byCategory("frontend") ?? byCategory("backend") ?? rootNodes[0];
  }
  if (anchorCategory === "hosting") {
    return byCategory("frontend") ?? byCategory("backend") ?? rootNodes[0];
  }
  return byCategory("backend") ?? byCategory("frontend") ?? rootNodes[0];
}

function repairDisconnectedGraph(
  nodes: GeneratedNode[],
  edges: GeneratedEdge[]
): {
  edges: GeneratedEdge[];
  disconnectedComponentsBeforeRepair: number;
  isolatedNodesBeforeRepair: number;
  repairEdgesAdded: number;
  disconnectedComponentsAfterRepair: number;
  isolatedNodesAfterRepair: number;
} {
  if (nodes.length <= 1) {
    return {
      edges,
      disconnectedComponentsBeforeRepair: 1,
      isolatedNodesBeforeRepair: 0,
      repairEdgesAdded: 0,
      disconnectedComponentsAfterRepair: 1,
      isolatedNodesAfterRepair: 0,
    };
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const componentsBefore = getConnectedComponents(nodes, edges);
  const isolatedBefore = countIsolatedNodes(nodes, edges);
  const repairedEdges = [...edges];
  let repairEdgesAdded = 0;

  if (componentsBefore.length > 1) {
    const rootComponent =
      componentsBefore
        .slice()
        .sort((a, b) => {
          const aAnchor = pickAnchorNode(a, nodeById);
          const bAnchor = pickAnchorNode(b, nodeById);
          const aScore = (aAnchor ? componentAnchorScore(aAnchor.data.category) : 0) + a.length;
          const bScore = (bAnchor ? componentAnchorScore(bAnchor.data.category) : 0) + b.length;
          return bScore - aScore;
        })[0] ?? componentsBefore[0];
    const rootIds = new Set(rootComponent);

    for (const componentIds of componentsBefore) {
      if (componentIds === rootComponent) continue;

      const anchor = pickAnchorNode(componentIds, nodeById);
      if (!anchor) continue;

      const partner = choosePartnerFromRoot(rootIds, nodeById, anchor.data.category);
      if (!partner || partner.id === anchor.id) continue;
      if (hasUndirectedEdge(repairedEdges, partner.id, anchor.id)) {
        for (const id of componentIds) rootIds.add(id);
        continue;
      }

      const { source, target } = chooseDirection(partner, anchor);
      const rel = relationForPair(source.data.category, target.data.category);
      repairedEdges.push({
        id: `edge-repair-${repairedEdges.length + 1}`,
        source: source.id,
        target: target.id,
        type: "custom",
        sourceHandle: "bottom",
        targetHandle: "top",
        animated: true,
        data: rel,
      });
      repairEdgesAdded += 1;
      for (const id of componentIds) rootIds.add(id);
    }
  }

  const componentsAfter = getConnectedComponents(nodes, repairedEdges);
  const isolatedAfter = countIsolatedNodes(nodes, repairedEdges);

  return {
    edges: repairedEdges,
    disconnectedComponentsBeforeRepair: componentsBefore.length,
    isolatedNodesBeforeRepair: isolatedBefore,
    repairEdgesAdded,
    disconnectedComponentsAfterRepair: componentsAfter.length,
    isolatedNodesAfterRepair: isolatedAfter,
  };
}

function applyLayout(nodes: GeneratedNode[], edges: GeneratedEdge[]): GeneratedNode[] {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  const levels = new Map<string, number>();

  for (const node of nodes) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
    levels.set(node.id, 0);
  }

  for (const edge of edges) {
    if (!incoming.has(edge.target) || !outgoing.has(edge.source)) continue;
    incoming.get(edge.target)!.push(edge.source);
    outgoing.get(edge.source)!.push(edge.target);
  }

  for (let i = 0; i < nodes.length; i += 1) {
    for (const edge of edges) {
      const sourceLevel = levels.get(edge.source) ?? 0;
      const targetLevel = levels.get(edge.target) ?? 0;
      if (sourceLevel + 1 > targetLevel) {
        levels.set(edge.target, sourceLevel + 1);
      }
    }
  }

  const slotByBand = new Map<string, number>();

  return nodes
    .slice()
    .sort((a, b) => {
      const levelDelta = (levels.get(a.id) ?? 0) - (levels.get(b.id) ?? 0);
      if (levelDelta !== 0) return levelDelta;
      return categoryRank(a.data.category) - categoryRank(b.data.category);
    })
    .map((node) => {
      const level = levels.get(node.id) ?? 0;
      const category = node.data.category;
      const key = `${level}:${category}`;
      const slot = slotByBand.get(key) ?? 0;
      slotByBand.set(key, slot + 1);

      const categoryY = 80 + categoryRank(category) * 84;
      return {
        ...node,
        position: {
          x: 120 + level * 300,
          y: categoryY + slot * 86,
        },
      };
    });
}

function buildNodesFromComponentIds(componentIds: string[]): GeneratedNode[] {
  const countsByComponent = new Map<string, number>();

  return componentIds
    .map((componentId) => {
      const meta = COMPONENT_META_BY_ID.get(componentId);
      if (!meta) return null;
      const nextIndex = (countsByComponent.get(componentId) ?? 0) + 1;
      countsByComponent.set(componentId, nextIndex);
      const id = `${componentId}_${nextIndex}`;

      return {
        id,
        type: "custom" as const,
        position: { x: 120, y: 80 },
        data: {
          label: meta.label,
          componentId,
          category: meta.category,
          icon: meta.icon,
          color: meta.color,
        },
      };
    })
    .filter((node): node is GeneratedNode => Boolean(node));
}

function normalizePrompt(prompt: string, artifact: z.infer<typeof artifactSchema> | null): string {
  if (prompt.trim().length > 0) return prompt.trim();
  if (!artifact) return "Build a production-ready architecture from selected components.";

  const lines = [
    artifact.ideaSummary?.trim(),
    artifact.mustHaveFeatures.length > 0
      ? `Must-have features: ${artifact.mustHaveFeatures.join(", ")}`
      : null,
    artifact.niceToHaveFeatures.length > 0
      ? `Nice-to-have features: ${artifact.niceToHaveFeatures.join(", ")}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

function parseLatestArtifactFromSnapshot(snapshot: unknown): z.infer<typeof artifactSchema> | null {
  if (!Array.isArray(snapshot)) return null;
  for (let i = snapshot.length - 1; i >= 0; i -= 1) {
    const entry = snapshot[i];
    if (!entry || typeof entry !== "object") continue;
    const content = String((entry as { content?: string }).content ?? "");
    const match = content.match(ARTIFACT_MARKER_REGEX);
    if (!match?.[1]) continue;
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      return artifactSchema.parse(parsed);
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeConstraints(
  rawConstraints: unknown,
  artifact: z.infer<typeof artifactSchema> | null
): Record<string, string | undefined> {
  const output: Record<string, string | undefined> = {};
  const source =
    rawConstraints && typeof rawConstraints === "object"
      ? (rawConstraints as Record<string, unknown>)
      : {};
  const artifactConstraints = artifact?.constraints ?? {};

  const read = (key: string) => {
    const fromBody = source[key];
    if (fromBody === null || fromBody === undefined || fromBody === "") {
      const fromArtifact = artifactConstraints[key as keyof typeof artifactConstraints];
      return fromArtifact === null || fromArtifact === undefined || fromArtifact === ""
        ? undefined
        : String(fromArtifact);
    }
    return String(fromBody);
  };

  output.budgetLevel = read("budgetLevel");
  output.teamSize = read("teamSize");
  output.timeline = read("timeline");
  output.trafficExpectation = read("trafficExpectation");
  output.dataVolume = read("dataVolume");
  output.uptimeTarget = read("uptimeTarget");
  output.regionCount = read("regionCount");
  output.devExperienceGoal = read("devExperienceGoal");
  output.dataSensitivity = read("dataSensitivity");
  return output;
}

async function generateWithRetries(
  prompt: string,
  constraints: Record<string, string | undefined>,
  selectedComponentIds: string[]
) {
  const componentCatalogSummary = COMPONENT_LIBRARY.map((category) => {
    const ids = category.components.map((component) => component.id).join(", ");
    return `- ${category.name}: ${ids}`;
  }).join("\n");

  const requiredSelectionText =
    selectedComponentIds.length > 0
      ? `\nRequired components that must be present in nodes:\n${selectedComponentIds.join(", ")}`
      : "";

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const tokenBudget =
      GENERATION_TOKEN_BUDGETS[Math.min(attempt - 1, GENERATION_TOKEN_BUDGETS.length - 1)];
    const compactnessRules =
      attempt === 1
        ? ""
        : `
STRICT COMPACT MODE:
- Keep node ids and edge ids short (n1, n2, e1, e2).
- Keep relationshipType to 1 short token when possible.
- Keep protocol to one of: http, https, rpc, sql, ws, s3, event, none.
- Keep rationale to 1-2 short sentences.
- Keep assumptions to max 2 short bullets.`;
    try {
      return await generateObject({
        model: getPrimaryTextModel(),
        schema: architectureSchema,
        prompt: `You are an expert software architect. Build a practical architecture graph.

APP IDEA:
${prompt || "No idea provided"}

CONSTRAINTS:
${Object.entries(constraints)
  .filter(([, value]) => value)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n") || "- none"}
${requiredSelectionText}

COMPONENT CATALOG (use ONLY these component IDs):
${componentCatalogSummary}

RULES:
1. Use 4-14 nodes.
2. Use valid component ids only.
3. If required components are provided, include all of them.
4. Add realistic edges showing dependency/data flow.
5. Use 8-16 edges unless fewer are needed.
6. Keep relationshipType and protocol short and machine-friendly.
7. In edges.source and edges.target, prefer component IDs (not abstract IDs) for reliable mapping.
8. Keep architecture implementation-ready.
${compactnessRules}`,
        maxOutputTokens: tokenBudget,
        providerOptions: LOW_REASONING_PROVIDER_OPTIONS,
      });
    } catch (error) {
      lastError = error;
      console.error(`Generate attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} failed:`, error);
      if (attempt < MAX_GENERATION_ATTEMPTS) await sleep(250 * attempt);
    }
  }

  throw lastError ?? new Error("Architecture generation failed after retries");
}

function buildGraphFromModel(
  result: z.infer<typeof architectureSchema>,
  selectedComponentIds: string[]
): { nodes: GeneratedNode[]; edges: GeneratedEdge[]; diagnostics: GraphBuildDiagnostics } {
  const modelNodeEntries = result.nodes
    .map((node, index) => ({
      modelId: (node.id?.trim().toLowerCase() || `n${index + 1}`).trim(),
      componentId: String(node.componentId || "").trim().toLowerCase(),
    }))
    .filter((node) => node.modelId.length > 0 && VALID_COMPONENT_IDS.has(node.componentId));

  const modelNodeIds = modelNodeEntries
    .map((node) => node.componentId)
    .filter((componentId, index, all) => all.indexOf(componentId) === index);

  const requiredComponentIds = selectedComponentIds.length > 0 ? selectedComponentIds : [];
  const mergedComponentIds = [
    ...requiredComponentIds,
    ...modelNodeIds.filter((id) => !requiredComponentIds.includes(id)),
  ];

  const nodes = buildNodesFromComponentIds(mergedComponentIds);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const firstNodeByComponentId = new Map<string, GeneratedNode>();
  for (const node of nodes) {
    if (!firstNodeByComponentId.has(node.data.componentId)) {
      firstNodeByComponentId.set(node.data.componentId, node);
    }
  }
  const modelIdToGeneratedNodeId = new Map<string, string>();
  for (const modelNode of modelNodeEntries) {
    const mappedNode = firstNodeByComponentId.get(modelNode.componentId);
    if (!mappedNode) continue;
    modelIdToGeneratedNodeId.set(modelNode.modelId, mappedNode.id);
  }

  const resolveRef = (value: string): string | null => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (nodeById.has(normalized)) return normalized;
    const byModelNode = modelIdToGeneratedNodeId.get(normalized);
    if (byModelNode) return byModelNode;
    const byComponent = firstNodeByComponentId.get(normalized);
    if (byComponent) return byComponent.id;
    return null;
  };

  const edges: GeneratedEdge[] = [];
  for (let i = 0; i < result.edges.length; i += 1) {
    const edge = result.edges[i];
    const sourceRef = resolveRef(String(edge.source || "").trim().toLowerCase());
    const targetRef = resolveRef(String(edge.target || "").trim().toLowerCase());
    if (!sourceRef || !targetRef || sourceRef === targetRef) continue;

    const edgeId = edge.id?.trim() || `edge-${i + 1}`;
    if (edges.some((existing) => existing.source === sourceRef && existing.target === targetRef)) {
      continue;
    }

    edges.push({
      id: edgeId,
      source: sourceRef,
      target: targetRef,
      type: "custom",
      sourceHandle: "bottom",
      targetHandle: "top",
      animated: true,
      data: {
        relationshipType: edge.relationshipType || "invokes",
        protocol: edge.protocol || "RPC",
      },
    });
  }

  const usedHeuristicBootstrap = edges.length === 0;
  const bootstrapEdges = usedHeuristicBootstrap ? buildHeuristicEdges(nodes) : edges;
  const repaired = repairDisconnectedGraph(nodes, bootstrapEdges);
  const laidOutNodes = applyLayout(nodes, repaired.edges);

  return {
    nodes: laidOutNodes,
    edges: repaired.edges,
    diagnostics: {
      modelEdgesRaw: result.edges.length,
      modelEdgesResolved: edges.length,
      usedHeuristicBootstrap,
      disconnectedComponentsBeforeRepair: repaired.disconnectedComponentsBeforeRepair,
      isolatedNodesBeforeRepair: repaired.isolatedNodesBeforeRepair,
      repairEdgesAdded: repaired.repairEdgesAdded,
      disconnectedComponentsAfterRepair: repaired.disconnectedComponentsAfterRepair,
      isolatedNodesAfterRepair: repaired.isolatedNodesAfterRepair,
    },
  };
}

function buildDeterministicFallback(componentIds: string[]): { nodes: GeneratedNode[]; edges: GeneratedEdge[] } {
  const nodes = buildNodesFromComponentIds(componentIds);
  const edges = buildHeuristicEdges(nodes);
  return { nodes: applyLayout(nodes, edges), edges };
}

function inferFallbackSelection(prompt: string): string[] {
  const text = prompt.toLowerCase();
  const selected = ["nextjs", "convex", "postgresql", "clerk"];
  if (/\b(ai|llm|agent|chat|assistant|rag|embedding)\b/.test(text)) selected.push("openai", "pinecone");
  if (/\b(file|upload|video|image|document|storage)\b/.test(text)) selected.push("s3");
  if (/\b(realtime|real-time|live|presence|collab)\b/.test(text)) selected.push("pusher");
  return uniqueValidComponentIds(selected);
}

export async function POST(req: Request) {
  let prompt = "";
  let selectedComponentIds: string[] = [];
  let constraints: Record<string, string | undefined> = {};

  try {
    const body = await req.json();
    const artifact = parseLatestArtifactFromSnapshot(body?.sourceIdeationSnapshot);
    prompt = normalizePrompt(typeof body?.prompt === "string" ? body.prompt : "", artifact);
    selectedComponentIds = uniqueValidComponentIds(body?.selectedComponentIds);
    constraints = normalizeConstraints(body?.constraints, artifact);

    const result = await generateWithRetries(prompt, constraints, selectedComponentIds);
    const graph = buildGraphFromModel(result.object, selectedComponentIds);

    if (graph.nodes.length === 0) {
      throw new Error("No valid nodes generated");
    }

    return Response.json({
      nodes: graph.nodes,
      edges: graph.edges,
      rationale: result.object.rationale,
      assumptions: result.object.assumptions,
      generationDiagnostics: graph.diagnostics,
      usedFallback: false,
      source: "llm",
    });
  } catch (error) {
    console.error("Generate API error:", error);

    const fallbackSelection =
      selectedComponentIds.length > 0
        ? selectedComponentIds
        : inferFallbackSelection(prompt);
    const fallback = buildDeterministicFallback(fallbackSelection);

    return Response.json({
      nodes: fallback.nodes,
      edges: fallback.edges,
      rationale:
        "Deterministic scaffold was used because LLM generation did not complete successfully.",
      assumptions: [
        "Scaffold was generated from selected components and baseline architecture rules.",
      ],
      generationDiagnostics: {
        modelEdgesRaw: 0,
        modelEdgesResolved: 0,
        usedHeuristicBootstrap: true,
        disconnectedComponentsBeforeRepair: getConnectedComponents(fallback.nodes, fallback.edges).length,
        isolatedNodesBeforeRepair: countIsolatedNodes(fallback.nodes, fallback.edges),
        repairEdgesAdded: 0,
        disconnectedComponentsAfterRepair: getConnectedComponents(fallback.nodes, fallback.edges).length,
        isolatedNodesAfterRepair: countIsolatedNodes(fallback.nodes, fallback.edges),
      },
      usedFallback: true,
      source: "deterministic_scaffold",
    });
  }
}
