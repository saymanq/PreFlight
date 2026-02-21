import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { COMPONENT_CATALOG, getComponentByType, type ComponentCategory } from "@/lib/component-catalog";

const VALID_TYPES = COMPONENT_CATALOG.map((c) => c.type);
const VALID_TYPE_SET = new Set(VALID_TYPES);

const CATEGORY_Y: Record<ComponentCategory, number> = {
    frontend: 100,
    auth: 220,
    backend: 340,
    ai: 360,
    data: 520,
    storage: 520,
    infra: 620,
    deployment: 700,
    observability: 700,
};

const architectureSchema = z.object({
    nodes: z.array(
        z.object({
            id: z.string().optional(),
            type: z.string().describe("Must be one of the available component type strings"),
            position: z
                .object({
                    x: z.number(),
                    y: z.number(),
                })
                .optional(),
        })
    ),
    edges: z
        .array(
            z.object({
                id: z.string().optional(),
                source: z.string(),
                target: z.string(),
                data: z
                    .object({
                        relationshipType: z.string().optional(),
                        protocol: z.string().optional(),
                    })
                    .optional(),
            })
        )
        .default([]),
    rationale: z.string().default(""),
    assumptions: z.array(z.string()).default([]),
});

const MAX_GENERATION_ATTEMPTS = 3;

async function sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetries(prompt: string, constraints: Record<string, string | undefined>) {
    const availableTypes = VALID_TYPES.join(", ");

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
        try {
            return await generateObject({
                model: google("gemini-3.1-pro-preview"),
                schema: architectureSchema,
                prompt: `You are an expert software architect. Generate an architecture graph.

APP IDEA: ${prompt || "No idea provided"}

CONSTRAINTS:
${Object.entries(constraints)
    .filter(([, value]) => value)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n") || "- none"}

AVAILABLE COMPONENT TYPES (use ONLY these exact type strings):
${availableTypes}

RULES:
1. Generate 4-10 nodes.
2. Use only available type strings.
3. Include realistic dependencies and data flow.
4. Keep IDs simple and stable.
5. Prefer practical, implementation-ready architecture choices.`,
            });
        } catch (error) {
            lastError = error;
            console.error(`Generate attempt ${attempt}/${MAX_GENERATION_ATTEMPTS} failed:`, error);

            if (attempt < MAX_GENERATION_ATTEMPTS) {
                await sleep(250 * attempt);
            }
        }
    }

    throw lastError ?? new Error("Architecture generation failed after retries");
}

function normalizeType(rawType: string): string | null {
    if (!rawType) return null;

    const trimmed = rawType.trim();
    if (VALID_TYPE_SET.has(trimmed)) return trimmed;

    const normalized = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");

    if (VALID_TYPE_SET.has(normalized)) return normalized;

    const byLabel = COMPONENT_CATALOG.find((c) => c.label.toLowerCase() === trimmed.toLowerCase());
    if (byLabel) return byLabel.type;

    return null;
}

function sanitizeNodeId(rawId: string | undefined, fallback: string, usedIds: Set<string>): string {
    const base =
        rawId && rawId.trim().length > 0
            ? rawId.trim().replace(/[^a-zA-Z0-9_-]/g, "_")
            : fallback;

    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) {
        id = `${base}_${suffix}`;
        suffix += 1;
    }

    usedIds.add(id);
    return id;
}

function defaultPositionFor(type: string, categoryCounts: Partial<Record<ComponentCategory, number>>) {
    const def = getComponentByType(type);
    const category = def?.category ?? "backend";
    const idx = categoryCounts[category] ?? 0;
    categoryCounts[category] = idx + 1;

    const baseX = category === "ai" ? 560 : 120;
    const x = baseX + idx * 280;
    const y = CATEGORY_Y[category];

    return { x, y };
}

function buildNode(type: string, index: number, position?: { x: number; y: number }) {
    const catalogDef = getComponentByType(type);
    if (!catalogDef) return null;

    return {
        id: `${type}_${index + 1}`,
        type: "custom",
        position: position ?? { x: 120 + (index % 4) * 280, y: CATEGORY_Y[catalogDef.category] },
        data: {
            type,
            category: catalogDef.category,
            label: catalogDef.label,
            provider: catalogDef.provider,
            icon: catalogDef.icon,
            config: catalogDef.defaultConfig,
            tags: catalogDef.tags,
        },
    };
}

function buildFallbackArchitecture(prompt: string, constraints: Record<string, string | undefined>) {
    const normalizedPrompt = (prompt || "").toLowerCase();
    const selected = new Set<string>(["nextjs_app", "convex_backend", "convex_db", "clerk_auth"]);

    if (/(ai|llm|assistant|chatbot|agent|rag|semantic|embedding|vector)/i.test(normalizedPrompt)) {
        selected.add("openai_llm");
        selected.add("embeddings_provider");
        selected.add("vector_db");
    }

    if (/(upload|file|image|video|document|attachment)/i.test(normalizedPrompt)) {
        selected.add("s3_r2");
    }

    if (/(realtime|real-time|live|presence|collab|collaboration)/i.test(normalizedPrompt)) {
        selected.add("websocket_realtime");
    }

    if (/(payment|subscription|billing|checkout)/i.test(normalizedPrompt)) {
        selected.add("external_api");
    }

    if (constraints.trafficExpectation === "high") {
        selected.add("cdn");
        selected.add("rate_limiter");
    }

    if (constraints.timeline !== "hackathon") {
        selected.add("monitoring");
    }

    if (selected.has("openai_llm")) {
        selected.add("queue");
        selected.add("worker");
    }

    const nodeTypes = [...selected].filter((type) => VALID_TYPE_SET.has(type));
    const nodes = nodeTypes
        .map((type, i) => buildNode(type, i))
        .filter((node): node is NonNullable<ReturnType<typeof buildNode>> => Boolean(node));

    const idByType = new Map(nodes.map((node) => [node.data.type, node.id]));

    const edges: Array<{
        id: string;
        source: string;
        target: string;
        type: "custom";
        animated: true;
        data: { relationshipType: string; protocol: string };
    }> = [];

    const pushEdge = (sourceType: string, targetType: string, relationshipType: string, protocol = "RPC") => {
        const source = idByType.get(sourceType);
        const target = idByType.get(targetType);
        if (!source || !target || source === target) return;
        edges.push({
            id: `edge_${edges.length + 1}`,
            source,
            target,
            type: "custom",
            animated: true,
            data: { relationshipType, protocol },
        });
    };

    pushEdge("nextjs_app", "clerk_auth", "authenticates", "HTTP");
    pushEdge("nextjs_app", "convex_backend", "invokes", "HTTP");
    pushEdge("convex_backend", "convex_db", "reads", "RPC");
    pushEdge("convex_backend", "convex_db", "writes", "RPC");
    pushEdge("convex_backend", "s3_r2", "uploads_to", "HTTP");
    pushEdge("convex_backend", "openai_llm", "invokes", "HTTP");
    pushEdge("convex_backend", "embeddings_provider", "invokes", "HTTP");
    pushEdge("embeddings_provider", "vector_db", "writes", "RPC");
    pushEdge("convex_backend", "vector_db", "reads", "RPC");
    pushEdge("convex_backend", "queue", "queues", "RPC");
    pushEdge("queue", "worker", "invokes", "RPC");
    pushEdge("worker", "openai_llm", "invokes", "HTTP");
    pushEdge("nextjs_app", "websocket_realtime", "subscribes", "WebSocket");
    pushEdge("convex_backend", "websocket_realtime", "publishes", "WebSocket");
    pushEdge("nextjs_app", "cdn", "serves", "HTTP");
    pushEdge("convex_backend", "monitoring", "emits", "HTTP");
    pushEdge("nextjs_app", "monitoring", "emits", "HTTP");
    pushEdge("convex_backend", "external_api", "invokes", "HTTP");

    return {
        nodes,
        edges,
        rationale:
            "Fallback architecture was produced from app intent and constraints because AI generation did not complete successfully.",
        assumptions: [
            "Defaulted to a managed full-stack baseline (Next.js + Convex + Auth).",
            "Added optional AI, storage, and scalability components only when implied by prompt/constraints.",
        ],
    };
}

function enrichGeneratedGraph(result: z.infer<typeof architectureSchema>) {
    const usedIds = new Set<string>();
    const idMap = new Map<string, string>();
    const categoryCounts: Partial<Record<ComponentCategory, number>> = {};

    const enrichedNodes = result.nodes
        .map((node, index) => {
            const normalizedType = normalizeType(node.type);
            if (!normalizedType) return null;

            const catalogDef = getComponentByType(normalizedType);
            if (!catalogDef) return null;

            const rawId = node.id?.trim();
            const safeId = sanitizeNodeId(rawId, `${normalizedType}_${index + 1}`, usedIds);
            if (rawId) idMap.set(rawId, safeId);

            return {
                id: safeId,
                type: "custom",
                position: node.position ?? defaultPositionFor(normalizedType, categoryCounts),
                data: {
                    type: normalizedType,
                    category: catalogDef.category,
                    label: catalogDef.label,
                    provider: catalogDef.provider,
                    icon: catalogDef.icon,
                    config: catalogDef.defaultConfig,
                    tags: catalogDef.tags,
                },
            };
        })
        .filter((node): node is NonNullable<typeof node> => Boolean(node));

    const validNodeIds = new Set(enrichedNodes.map((node) => node.id));

    const enrichedEdges = result.edges
        .map((edge, index) => {
            const source = idMap.get(edge.source) ?? edge.source;
            const target = idMap.get(edge.target) ?? edge.target;
            if (!validNodeIds.has(source) || !validNodeIds.has(target) || source === target) {
                return null;
            }

            return {
                id: edge.id || `edge_${index + 1}`,
                source,
                target,
                type: "custom",
                animated: true,
                data: {
                    relationshipType: edge.data?.relationshipType || "invokes",
                    protocol: edge.data?.protocol || "RPC",
                },
            };
        })
        .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

    if (enrichedEdges.length === 0 && enrichedNodes.length > 1) {
        for (let i = 0; i < enrichedNodes.length - 1; i += 1) {
            enrichedEdges.push({
                id: `edge_${i + 1}`,
                source: enrichedNodes[i].id,
                target: enrichedNodes[i + 1].id,
                type: "custom",
                animated: true,
                data: { relationshipType: "invokes", protocol: "RPC" },
            });
        }
    }

    return { nodes: enrichedNodes, edges: enrichedEdges };
}

export async function POST(req: Request) {
    let prompt = "";
    let constraints: Record<string, string | undefined> = {};

    try {
        const body = await req.json();
        prompt = typeof body?.prompt === "string" ? body.prompt : "";
        constraints = body?.constraints && typeof body.constraints === "object"
            ? (body.constraints as Record<string, string | undefined>)
            : {};

        const result = await generateWithRetries(prompt, constraints);

        const enriched = enrichGeneratedGraph(result.object);
        if (enriched.nodes.length === 0) {
            throw new Error("AI output did not include valid catalog components");
        }

        return Response.json({
            nodes: enriched.nodes,
            edges: enriched.edges,
            rationale: result.object.rationale,
            assumptions: result.object.assumptions,
        });
    } catch (error) {
        console.error("Generate API error:", error);

        const fallback = buildFallbackArchitecture(prompt, constraints);

        return Response.json({
            nodes: fallback.nodes,
            edges: fallback.edges,
            rationale: fallback.rationale,
            assumptions: [
                ...fallback.assumptions,
                "Fallback path used because AI generation failed.",
            ],
        });
    }
}
