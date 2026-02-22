import { generateObject } from "ai";
import { COMPONENT_LIBRARY } from "@/lib/components-data";
import {
    FAST_OUTPUT_TOKENS,
    getPrimaryTextModel,
    LOW_REASONING_PROVIDER_OPTIONS,
} from "@/lib/ai/azure-openai";
import {
    COMPONENT_CATALOG,
    CATEGORY_ORDER,
    CATEGORY_LABELS,
    type ComponentCategory,
} from "@/lib/component-catalog";
import { ALL_COMPONENTS } from "@/lib/scoring/component-weights";
import { z } from "zod";

interface WorkspaceMessage {
    role: "user" | "assistant";
    content: string;
}

type CanvasAction = Record<string, unknown>;

type CanvasNode = {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        label: string;
        componentId: string;
        category: string;
        icon: string;
        color: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

type CanvasEdge = {
    id: string;
    source: string;
    target: string;
    type: string;
    sourceHandle?: string;
    targetHandle?: string;
    animated?: boolean;
    data?: Record<string, unknown>;
    [key: string]: unknown;
};

const FALLBACK_COLOR = "#6b7280";
const FALLBACK_ICON = "🧩";

const COMPONENT_BY_ID = new Map(
    COMPONENT_LIBRARY.flatMap((category) =>
        category.components.map((component) => [
            component.id,
            {
                id: component.id,
                name: component.name,
                icon: component.icon || FALLBACK_ICON,
                color: component.color || FALLBACK_COLOR,
                category: category.id,
            },
        ])
    )
);

const META_BY_KEY = new Map(ALL_COMPONENTS.map((m) => [m.key, m]));

function buildSlimCatalog(): string {
    const grouped = new Map<ComponentCategory, string[]>();
    for (const c of COMPONENT_CATALOG) {
        const list = grouped.get(c.category) ?? [];
        list.push(`${c.type} (${c.label})`);
        grouped.set(c.category, list);
    }
    const sections: string[] = [];
    for (const cat of CATEGORY_ORDER) {
        const items = grouped.get(cat);
        if (!items?.length) continue;
        sections.push(`[${CATEGORY_LABELS[cat] ?? cat}] ${items.join(", ")}`);
    }
    return sections.join("\n");
}

function buildComponentDetails(componentIds: string[]): string {
    if (componentIds.length === 0) return "";
    const lines = componentIds.map((id) => {
        const meta = META_BY_KEY.get(id);
        if (!meta) return null;
        const s = meta.scores;
        return `  ${id}: ${meta.name} | build=${s.buildSpeed} scale=${s.scalability} cost=${s.cost} ops=${s.opsBurden} lock=${s.lockIn} rel=${s.reliability} | best: ${meta.bestFor.slice(0, 3).join(", ")} | avoid: ${meta.avoidWhen.slice(0, 2).join(", ")}`;
    }).filter(Boolean);
    return lines.length > 0 ? `\nDetailed scores for current canvas components:\n${lines.join("\n")}` : "";
}

const SLIM_CATALOG = buildSlimCatalog();

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

function summarizeMessages(messages: WorkspaceMessage[] | undefined, heading: string): string {
    if (!messages || messages.length === 0) return "";
    const lines = messages
        .slice(-20)
        .map((message) => `- ${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
        .join("\n");
    return `\n${heading}:\n${lines}`;
}

function isLengthOrParseError(error: unknown): boolean {
    const err = error as {
        message?: string;
        finishReason?: string;
        cause?: { message?: string };
    };
    const message = `${err?.message ?? ""} ${err?.cause?.message ?? ""}`.toLowerCase();
    return (
        err?.finishReason === "length" ||
        message.includes("no object generated") ||
        message.includes("json parsing failed") ||
        message.includes("unterminated string") ||
        message.includes("could not parse the response")
    );
}

const actionSchema = z
    .object({
        action: z.enum([
            "add_component",
            "remove_component",
            "move_component",
            "update_component",
            "connect_components",
            "remove_connection",
            "clear_canvas",
        ]),
        componentId: nullableString,
        nodeId: nullableString,
        id: nullableString,
        label: nullableString,
        newLabel: nullableString,
        sourceId: nullableString,
        targetId: nullableString,
        edgeId: nullableString,
        x: nullableNumber,
        y: nullableNumber,
        relationshipType: nullableString,
        protocol: nullableString,
    })
    .passthrough();

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeNodes(rawNodes: unknown[]): CanvasNode[] {
    return rawNodes
        .map((rawNode, index) => {
            const node = asRecord(rawNode);
            if (!node) return null;

            const data = asRecord(node.data) ?? {};
            const topLevelComponentId = asString(node.componentId);
            const componentId = asString(data.componentId) ?? topLevelComponentId ?? "component";
            const componentMeta = COMPONENT_BY_ID.get(componentId);
            const id = asString(node.id) ?? `${componentId}-${Date.now()}-${index}`;

            const positionRecord = asRecord(node.position);
            const x = asNumber(positionRecord?.x) ?? 120 + (index % 4) * 260;
            const y = asNumber(positionRecord?.y) ?? 100 + Math.floor(index / 4) * 180;

            const label =
                asString(data.label) ??
                asString(node.label) ??
                componentMeta?.name ??
                componentId;
            const category =
                asString(data.category) ??
                asString(node.category) ??
                componentMeta?.category ??
                "general";
            const icon = asString(data.icon) ?? componentMeta?.icon ?? FALLBACK_ICON;
            const color = asString(data.color) ?? componentMeta?.color ?? FALLBACK_COLOR;

            return {
                ...node,
                id,
                type: asString(node.type) ?? "custom",
                position: { x, y },
                data: {
                    ...data,
                    label,
                    componentId,
                    category,
                    icon,
                    color,
                },
            };
        })
        .filter((node): node is CanvasNode => node !== null);
}

function normalizeEdges(rawEdges: unknown[]): CanvasEdge[] {
    return rawEdges
        .map((rawEdge, index) => {
            const edge = asRecord(rawEdge);
            if (!edge) return null;
            const source = asString(edge.source);
            const target = asString(edge.target);
            if (!source || !target) return null;

            return {
                ...edge,
                id: asString(edge.id) ?? `edge-${Date.now()}-${index}`,
                source,
                target,
                type: asString(edge.type) ?? "custom",
            };
        })
        .filter((edge): edge is CanvasEdge => edge !== null);
}

function ensureUniqueNodeId(nodes: CanvasNode[], preferredId: string): string {
    const ids = new Set(nodes.map((node) => node.id));
    if (!ids.has(preferredId)) return preferredId;
    let counter = 1;
    while (ids.has(`${preferredId}-${counter}`)) counter += 1;
    return `${preferredId}-${counter}`;
}

function ensureUniqueEdgeId(edges: CanvasEdge[], preferredId: string): string {
    const ids = new Set(edges.map((edge) => edge.id));
    if (!ids.has(preferredId)) return preferredId;
    let counter = 1;
    while (ids.has(`${preferredId}-${counter}`)) counter += 1;
    return `${preferredId}-${counter}`;
}

function resolveNodeId(nodes: CanvasNode[], rawHint: unknown): string | null {
    const hint = asString(rawHint)?.toLowerCase();
    if (!hint) return null;

    const byId = nodes.find((node) => node.id.toLowerCase() === hint);
    if (byId) return byId.id;

    const byComponent = nodes.find(
        (node) => (node.data.componentId || "").toLowerCase() === hint
    );
    if (byComponent) return byComponent.id;

    const byLabel = nodes.find((node) => (node.data.label || "").toLowerCase() === hint);
    if (byLabel) return byLabel.id;

    const byContains = nodes.find(
        (node) =>
            node.id.toLowerCase().includes(hint) ||
            (node.data.label || "").toLowerCase().includes(hint) ||
            (node.data.componentId || "").toLowerCase().includes(hint)
    );
    return byContains?.id ?? null;
}

function applyCanvasActions(
    startingNodes: CanvasNode[],
    startingEdges: CanvasEdge[],
    actions: CanvasAction[]
): { nodes: CanvasNode[]; edges: CanvasEdge[]; changed: boolean; cleared: boolean } {
    let nodes = [...startingNodes];
    let edges = [...startingEdges];
    let changed = false;
    let cleared = false;

    for (const rawAction of actions) {
        const action = asString(rawAction.action)?.toLowerCase();
        if (!action) continue;

        if (action === "clear_canvas" || action === "clear") {
            nodes = [];
            edges = [];
            changed = true;
            cleared = true;
            continue;
        }

        if (action === "add_component" || action === "add-node" || action === "create_component") {
            const componentId =
                asString(rawAction.componentId) ??
                asString(rawAction.componentType) ??
                asString(rawAction.type) ??
                asString(rawAction.component);
            if (!componentId) continue;

            const componentMeta = COMPONENT_BY_ID.get(componentId);
            if (!componentMeta) continue;

            const preferredNodeId =
                asString(rawAction.nodeId) ??
                asString(rawAction.id) ??
                `${componentId}-${Date.now()}`;
            const nodeId = ensureUniqueNodeId(nodes, preferredNodeId);
            const x = asNumber(rawAction.x) ?? 120 + (nodes.length % 4) * 260;
            const y = asNumber(rawAction.y) ?? 100 + Math.floor(nodes.length / 4) * 180;
            const label = asString(rawAction.label) ?? componentMeta.name;

            nodes.push({
                id: nodeId,
                type: "custom",
                position: { x, y },
                data: {
                    label,
                    componentId: componentMeta.id,
                    category: componentMeta.category,
                    icon: componentMeta.icon,
                    color: componentMeta.color,
                },
            });
            changed = true;
            continue;
        }

        if (action === "remove_component" || action === "delete_component" || action === "remove-node") {
            const nodeId =
                resolveNodeId(nodes, rawAction.nodeId) ??
                resolveNodeId(nodes, rawAction.id) ??
                resolveNodeId(nodes, rawAction.label);
            if (!nodeId) continue;

            const beforeCount = nodes.length;
            nodes = nodes.filter((node) => node.id !== nodeId);
            edges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
            if (nodes.length !== beforeCount) changed = true;
            continue;
        }

        if (action === "move_component" || action === "move-node" || action === "reposition_component") {
            const nodeId =
                resolveNodeId(nodes, rawAction.nodeId) ??
                resolveNodeId(nodes, rawAction.id) ??
                resolveNodeId(nodes, rawAction.label);
            if (!nodeId) continue;

            const x = asNumber(rawAction.x);
            const y = asNumber(rawAction.y);
            if (x === null && y === null) continue;

            nodes = nodes.map((node) =>
                node.id !== nodeId
                    ? node
                    : {
                        ...node,
                        position: {
                            x: x ?? node.position.x,
                            y: y ?? node.position.y,
                        },
                    }
            );
            changed = true;
            continue;
        }

        if (action === "update_component" || action === "edit_component") {
            const nodeId =
                resolveNodeId(nodes, rawAction.nodeId) ??
                resolveNodeId(nodes, rawAction.id) ??
                resolveNodeId(nodes, rawAction.label);
            if (!nodeId) continue;

            const newLabel = asString(rawAction.newLabel) ?? asString(rawAction.label);
            const dataPatch = asRecord(rawAction.data) ?? {};
            const configPatch = asRecord(rawAction.config) ?? {};
            nodes = nodes.map((node) =>
                node.id !== nodeId
                    ? node
                    : {
                        ...node,
                        data: {
                            ...node.data,
                            ...dataPatch,
                            ...(Object.keys(configPatch).length > 0
                                ? {
                                    config: {
                                        ...(asRecord(node.data.config) ?? {}),
                                        ...configPatch,
                                    },
                                }
                                : {}),
                            ...(newLabel ? { label: newLabel } : {}),
                        },
                    }
            );
            changed = true;
            continue;
        }

        if (action === "connect_components" || action === "add_connection" || action === "connect") {
            const sourceId =
                resolveNodeId(nodes, rawAction.sourceId) ??
                resolveNodeId(nodes, rawAction.source) ??
                resolveNodeId(nodes, rawAction.from);
            const targetId =
                resolveNodeId(nodes, rawAction.targetId) ??
                resolveNodeId(nodes, rawAction.target) ??
                resolveNodeId(nodes, rawAction.to);
            if (!sourceId || !targetId || sourceId === targetId) continue;

            const alreadyExists = edges.some(
                (edge) => edge.source === sourceId && edge.target === targetId
            );
            if (alreadyExists) continue;

            const preferredEdgeId =
                asString(rawAction.edgeId) ?? `${sourceId}-${targetId}-${Date.now()}`;
            const relationshipType = asString(rawAction.relationshipType) ?? "depends_on";
            const protocol = asString(rawAction.protocol) ?? "sync";
            const edgeId = ensureUniqueEdgeId(edges, preferredEdgeId);

            edges.push({
                id: edgeId,
                type: "custom",
                source: sourceId,
                target: targetId,
                sourceHandle: "bottom",
                targetHandle: "top",
                animated: true,
                data: {
                    relationshipType,
                    protocol,
                },
            });
            changed = true;
            continue;
        }

        if (action === "remove_connection" || action === "delete_connection" || action === "disconnect") {
            const edgeId = asString(rawAction.edgeId);
            if (edgeId) {
                const before = edges.length;
                edges = edges.filter((edge) => edge.id !== edgeId);
                if (edges.length !== before) changed = true;
                continue;
            }

            const sourceId =
                resolveNodeId(nodes, rawAction.sourceId) ??
                resolveNodeId(nodes, rawAction.source) ??
                resolveNodeId(nodes, rawAction.from);
            const targetId =
                resolveNodeId(nodes, rawAction.targetId) ??
                resolveNodeId(nodes, rawAction.target) ??
                resolveNodeId(nodes, rawAction.to);
            if (!sourceId || !targetId) continue;

            const before = edges.length;
            edges = edges.filter((edge) => !(edge.source === sourceId && edge.target === targetId));
            if (edges.length !== before) changed = true;
        }
    }

    return { nodes, edges, changed, cleared };
}

function buildSystemPrompt(
    nodeSummary: string,
    edgeSummary: string,
    nodeCount: number,
    canvasComponentIds: string[],
): string {
    const validIds = [...COMPONENT_BY_ID.keys()].join(", ");
    const canvasDetails = buildComponentDetails(canvasComponentIds);

    return `You are the PreFlight AI Architect — an expert system-design partner.

WORKFLOW: For every request: 1) Understand what the user wants 2) Analyze gaps in current architecture 3) Recommend approach with trade-offs 4) Execute via canvas actions.

DECISION FACTORS (scores 1-10): buildSpeed, complexity, scalability, cost, opsBurden, lockIn, reliability, aiReadiness.
- Compare alternatives when the choice isn't obvious.
- Flag high lock-in (>7) or ops-burden (>7).
- Suggest complementary components proactively.

RESPONSE: Return JSON with:
- assistantMessage: Concise explanation (why this choice, trade-offs, next steps). Max ~200 words.
- actions: Canvas mutations array. Empty [] if just discussing.
- updatedScope: Optional scope updates.

WHEN TO ACT vs DISCUSS:
- DISCUSS (actions=[]) for: "what should I use?", ambiguous requests, "suggest/recommend".
- EXECUTE (actions=[...]) for: "add/remove/replace/build/create", confirmations, unambiguous requests, empty canvas with clear goals.

LAYOUT: Frontend y=80-150, Auth y=200-280, Backend y=300-400, Data y=450-550, Infra y=600-700. x increments of ~250.

ACTIONS:
  add_component: { action, componentId, nodeId?, label?, x?, y? }
  remove_component: { action, nodeId }
  move_component: { action, nodeId, x?, y? }
  update_component: { action, nodeId, newLabel?, data?, config? }
  connect_components: { action, sourceId, targetId, relationshipType?, protocol? }
  remove_connection: { action, edgeId } or { action, sourceId, targetId }
  clear_canvas: { action }

CRITICAL: componentId MUST be one of the valid keys from the catalog below.

CURRENT CANVAS (${nodeCount} components):
${nodeSummary || "(empty)"}
Connections: ${edgeSummary || "(none)"}
${canvasDetails}

COMPONENT CATALOG (use these exact keys for componentId):
${SLIM_CATALOG}`;
}

export async function POST(req: Request) {
    try {
        const {
            message,
            architecture_json,
            conversation_history,
            constraints,
            scores,
            architecture_stats,
            cost_estimate,
            lint_issues,
            recent_actions,
            source_ideation_snapshot,
        } = await req.json();

        const nodes = normalizeNodes(
            Array.isArray(architecture_json?.nodes) ? architecture_json.nodes : []
        );
        const edges = normalizeEdges(
            Array.isArray(architecture_json?.edges) ? architecture_json.edges : []
        );

        const nodeSummary = nodes
            .slice(0, 80)
            .map((node) => {
                const meta = META_BY_KEY.get(node.data?.componentId ?? "");
                const scoreHint = meta
                    ? ` [scale=${meta.scores.scalability} cost=${meta.scores.cost} rel=${meta.scores.reliability}]`
                    : "";
                return `  ${node.id}: ${node.data?.label ?? "Component"} (${node.data?.componentId ?? "unknown"}) @ (${Math.round(node.position.x)}, ${Math.round(node.position.y)})${scoreHint}`;
            })
            .join("\n");

        const edgeSummary = edges
            .slice(0, 120)
            .map((edge) => {
                const relType = (edge.data as Record<string, unknown>)?.relationshipType ?? "connected";
                return `  ${edge.source} → ${edge.target} (${relType})`;
            })
            .join("\n");

        const canvasComponentIds = nodes
            .map((n) => n.data?.componentId)
            .filter((id): id is string => Boolean(id));
        const systemPrompt = buildSystemPrompt(nodeSummary, edgeSummary, nodes.length, canvasComponentIds);

        let contextBlock = `User message: ${String(message ?? "")}`;

        if (constraints && Object.keys(constraints).length > 0) {
            const constraintLines = Object.entries(constraints)
                .filter(([, v]) => Boolean(v))
                .map(([k, v]) => `  ${k}: ${v}`)
                .join("\n");
            if (constraintLines) {
                contextBlock += `\n\nProject Constraints:\n${constraintLines}`;
            }
        }

        if (scores && typeof scores === "object") {
            contextBlock += `\n\nCurrent Architecture Scores:\n${JSON.stringify(scores, null, 2)}`;
        }

        if (architecture_stats) {
            contextBlock += `\n\nArchitecture Stats: ${nodes.length} components, ${edges.length} connections`;
            if (architecture_stats.overallScore != null) {
                contextBlock += `, overall score: ${architecture_stats.overallScore}/10`;
            }
        }

        if (cost_estimate) {
            contextBlock += `\n\nEstimated Monthly Cost: ${JSON.stringify(cost_estimate)}`;
        }

        if (lint_issues?.length > 0) {
            const lintLines = lint_issues
                .slice(0, 8)
                .map((issue: { severity?: string; title?: string; suggestedFix?: string }) =>
                    `  [${issue.severity ?? "info"}] ${issue.title ?? "Issue"}${issue.suggestedFix ? ` → ${issue.suggestedFix}` : ""}`
                )
                .join("\n");
            contextBlock += `\n\nLint Issues:\n${lintLines}`;
        }

        if (recent_actions?.length > 0) {
            contextBlock += `\n\nRecent User Actions:\n${recent_actions.slice(-8).map((a: string) => `  ${a}`).join("\n")}`;
        }

        contextBlock += summarizeMessages(source_ideation_snapshot, "\nIdeation Context (prior discovery)");
        contextBlock += summarizeMessages(conversation_history, "\nConversation History");

        const responseSchema = z.object({
            assistantMessage: z.string().describe("Your conversational response to the user explaining your reasoning, trade-offs, and what you did or recommend. Max ~300 words."),
            actions: z.array(actionSchema).describe("Canvas mutations to apply. Return empty array [] if just discussing/planning."),
            updatedScope: z
                .object({
                    users: nullableNumber,
                    trafficLevel: nullableNumber,
                    dataVolumeGB: nullableNumber,
                    regions: nullableNumber,
                    availability: nullableNumber,
                })
                .nullable()
                .describe("Optional scope updates if the user's requirements imply scale changes."),
        });

        const callStructured = async (promptText: string, maxTokens: number) =>
            generateObject({
                model: getPrimaryTextModel(),
                schema: responseSchema,
                system: systemPrompt,
                prompt: promptText,
                maxOutputTokens: maxTokens,
                providerOptions: LOW_REASONING_PROVIDER_OPTIONS,
            });

        let result;
        try {
            result = await callStructured(contextBlock, FAST_OUTPUT_TOKENS.workspace);
        } catch (primaryError) {
            if (!isLengthOrParseError(primaryError)) {
                throw primaryError;
            }

            const compactRetryPrompt = `${contextBlock}

IMPORTANT OUTPUT LIMITS:
- assistantMessage must be concise (<= 120 words).
- Return at most 8 actions.
- Prefer high-impact connections/changes only.`;

            result = await callStructured(
                compactRetryPrompt,
                FAST_OUTPUT_TOKENS.workspaceRetry
            );
        }

        const { assistantMessage, actions, updatedScope } = result.object;
        const parsedActions = (actions as CanvasAction[]) ?? [];
        const normalizedScope = updatedScope
            ? Object.fromEntries(
                  Object.entries(updatedScope).filter(([, value]) => value != null)
              )
            : undefined;

        const { nodes: nextNodes, edges: nextEdges, changed, cleared } = applyCanvasActions(
            nodes,
            edges,
            parsedActions
        );

        return Response.json({
            message: assistantMessage || "I've analyzed your architecture. Let me know what you'd like to change.",
            session_id: "",
            suggest_implementation: false,
            canvas_action: changed ? (cleared ? "clear" : "update") : "none",
            updated_architecture: changed ? { nodes: nextNodes, edges: nextEdges } : undefined,
            updated_scope: normalizedScope,
        });
    } catch (error) {
        console.error("Workspace chat API error:", error);
        return new Response("Workspace chat failed.", { status: 500 });
    }
}
