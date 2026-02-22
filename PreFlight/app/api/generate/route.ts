import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { COMPONENT_LIBRARY } from "@/lib/components-data";
import {
  FAST_OUTPUT_TOKENS,
  LOW_REASONING_PROVIDER_OPTIONS,
} from "@/lib/ai/google-generation";

const ARTIFACT_MARKER_REGEX = /<pf_artifact>([\s\S]*?)<\/pf_artifact>/i;
const MAX_GENERATION_ATTEMPTS = 3;

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

const artifactSchema = z.object({
  ideaSummary: z.string().optional(),
  mustHaveFeatures: z.array(z.string()).default([]),
  niceToHaveFeatures: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  constraints: z
    .object({
      budgetLevel: z.string().optional(),
      teamSize: z.number().optional(),
      timeline: z.string().optional(),
      trafficExpectation: z.string().optional(),
      dataSensitivity: z.string().optional(),
      regionCount: z.number().optional(),
      uptimeTarget: z.number().optional(),
      devExperienceGoal: z.string().optional(),
    })
    .default({}),
});

const architectureSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().optional(),
      componentId: z.string().describe("Must be one of the known component ids"),
    })
  ),
  edges: z
    .array(
      z.object({
        id: z.string().optional(),
        source: z.string().describe("Use node id or component id"),
        target: z.string().describe("Use node id or component id"),
        relationshipType: z.string().optional(),
        protocol: z.string().optional(),
      })
    )
    .default([]),
  rationale: z.string().default(""),
  assumptions: z.array(z.string()).default([]),
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
  }
  for (const be of byCategory("backend")) {
    for (const db of byCategory("database")) pushEdge(be, db, "reads/writes", "RPC");
    for (const api of byCategory("api")) pushEdge(be, api, "uses", "RPC");
    for (const ai of byCategory("ai")) pushEdge(be, ai, "invokes", "HTTP");
    for (const queue of byCategory("messaging")) pushEdge(be, queue, "queues", "RPC");
    for (const cache of byCategory("realtime")) pushEdge(be, cache, "publishes", "WebSocket");
    for (const storage of byCategory("storage")) pushEdge(be, storage, "stores", "HTTP");
  }

  return edges;
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
    try {
      return await generateObject({
        model: google("gemini-3-flash-preview"),
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
5. Keep architecture implementation-ready.`,
        temperature: 0.2,
        maxOutputTokens: FAST_OUTPUT_TOKENS.architectureGenerate,
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
): { nodes: GeneratedNode[]; edges: GeneratedEdge[] } {
  const modelNodeIds = result.nodes
    .map((node) => String(node.componentId || "").trim().toLowerCase())
    .filter((componentId, index, all) => componentId && all.indexOf(componentId) === index)
    .filter((componentId) => VALID_COMPONENT_IDS.has(componentId));

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

  const resolveRef = (value: string): string | null => {
    if (nodeById.has(value)) return value;
    const byComponent = firstNodeByComponentId.get(value);
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

  const finalizedEdges = edges.length > 0 ? edges : buildHeuristicEdges(nodes);
  const laidOutNodes = applyLayout(nodes, finalizedEdges);
  return { nodes: laidOutNodes, edges: finalizedEdges };
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
      usedFallback: true,
      source: "deterministic_scaffold",
    });
  }
}
