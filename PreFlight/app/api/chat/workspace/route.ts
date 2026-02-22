import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { COMPONENT_LIBRARY } from "@/lib/components-data";
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

function summarizeMessages(messages: WorkspaceMessage[] | undefined, heading: string): string {
  if (!messages || messages.length === 0) return "";
  const lines = messages
    .slice(-20)
    .map((message) => `- ${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
  return `\n${heading}:\n${lines}`;
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
    componentId: z.string().optional(),
    nodeId: z.string().optional(),
    id: z.string().optional(),
    label: z.string().optional(),
    newLabel: z.string().optional(),
    sourceId: z.string().optional(),
    targetId: z.string().optional(),
    edgeId: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    relationshipType: z.string().optional(),
    protocol: z.string().optional(),
  })
  .passthrough();

const actionPlanSchema = z.object({
  assistantMessage: z.string(),
  actions: z.array(actionSchema),
  updatedScope: z
    .object({
      users: z.number().optional(),
      trafficLevel: z.number().optional(),
      dataVolumeGB: z.number().optional(),
      regions: z.number().optional(),
      availability: z.number().optional(),
    })
    .partial()
    .optional(),
});

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

    const availableComponentIds = [...COMPONENT_BY_ID.keys()].join(", ");

    const nodeSummary = nodes
      .slice(0, 80)
      .map(
        (node) =>
          `- ${node.id}: ${node.data?.label ?? "Component"} (${node.data?.componentId ?? "unknown"}) @ (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`
      )
      .join("\n");

    const edgeSummary = edges
      .slice(0, 120)
      .map((edge) => `- ${edge.id}: ${edge.source} -> ${edge.target}`)
      .join("\n");

    const systemPrompt = `You are the Preflight workspace assistant.

You return structured JSON with:
- assistantMessage: concise explanation to the user (max ~220 words)
- actions: array of canvas mutations (possibly empty)
- updatedScope: optional partial scope updates

When the user asks to edit architecture, include actions. Do not skip actions for edit requests.
Allowed actions:
- add_component
- remove_component
- move_component
- update_component
- connect_components
- remove_connection
- clear_canvas

Use only these component IDs for add_component: ${availableComponentIds}
When editing existing nodes/edges, prefer existing IDs from current canvas context.
Do not output markdown. Return only structured data matching the schema.`;

    const prompt = `User message:
${String(message ?? "")}

Current canvas components:
${nodeSummary || "- none"}

Current connections:
${edgeSummary || "- none"}

Constraints:
${JSON.stringify(constraints ?? {}, null, 2)}

Scores:
${JSON.stringify(scores ?? {}, null, 2)}

Architecture stats:
${JSON.stringify(architecture_stats ?? {}, null, 2)}

Cost estimate:
${JSON.stringify(cost_estimate ?? {}, null, 2)}

Lint issues:
${JSON.stringify(lint_issues ?? [], null, 2)}

Recent actions:
${JSON.stringify(recent_actions ?? [], null, 2)}
${summarizeMessages(source_ideation_snapshot, "Hidden ideation history context (not shown to user)")}
${summarizeMessages(conversation_history, "Workspace chat history")}`;

    let assistantMessage = "";
    let parsedActions: CanvasAction[] = [];
    let updatedScope: Record<string, unknown> | undefined;

    try {
      const structured = await generateObject({
        model: google("gemini-3-flash-preview"),
        schema: actionPlanSchema,
        system: systemPrompt,
        prompt,
        temperature: 0.3,
      });

      assistantMessage = structured.object.assistantMessage?.trim() || "";
      parsedActions = (structured.object.actions as CanvasAction[]) ?? [];
      updatedScope = structured.object.updatedScope as Record<string, unknown> | undefined;
    } catch {
      // Fallback: return a text-only assistant response if structured generation fails.
      const textResult = await generateText({
        model: google("gemini-3-flash-preview"),
        system:
          "You are the Preflight workspace assistant. Give concise, actionable guidance for the user's architecture.",
        messages: [
          {
            role: "user",
            content: String(message ?? ""),
          },
        ],
        temperature: 0.4,
        maxOutputTokens: 900,
      });
      assistantMessage = textResult.text.trim();
      parsedActions = [];
      updatedScope = undefined;
    }

    const { nodes: nextNodes, edges: nextEdges, changed, cleared } = applyCanvasActions(
      nodes,
      edges,
      parsedActions
    );

    return Response.json({
      message: assistantMessage || "Applied the requested architecture update.",
      session_id: "",
      suggest_implementation: false,
      canvas_action: changed ? (cleared ? "clear" : "update") : "none",
      updated_architecture: changed ? { nodes: nextNodes, edges: nextEdges } : undefined,
      updated_scope: updatedScope,
    });
  } catch (error) {
    console.error("Workspace chat API error:", error);
    return new Response("Workspace chat failed.", { status: 500 });
  }
}
