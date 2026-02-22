interface GNode { id: string; data?: { label?: string; category?: string; componentId?: string }; type?: string; category?: string }
interface GEdge { id: string; source: string; target: string; syncAsync?: string; relationship?: string }

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

const CATEGORY_SHAPES: Record<string, { open: string; close: string }> = {
  frontend: { open: "[", close: "]" },
  backend: { open: "((", close: "))" },
  database: { open: "[(", close: ")]" },
  ml: { open: "{", close: "}" },
  auth: { open: "[/", close: "/]" },
  default: { open: "[", close: "]" },
};

export function generateMermaidDiagram(nodes: GNode[], edges: GEdge[]): string {
  if (nodes.length === 0) return "graph TD\n  Empty[No components]";

  let mermaid = "graph TD\n";

  for (const node of nodes) {
    const label = node.data?.label || node.type || "Unknown";
    const category = node.data?.category || node.category || "default";
    const shape = CATEGORY_SHAPES[category] || CATEGORY_SHAPES.default;
    const sid = safeId(node.id);
    mermaid += `  ${sid}${shape.open}"${label}"${shape.close}\n`;
  }

  mermaid += "\n";

  for (const edge of edges) {
    const arrow = edge.syncAsync === "async" ? "-.->" : "-->";
    const label = edge.relationship ? `|${edge.relationship}|` : "";
    mermaid += `  ${safeId(edge.source)} ${arrow}${label} ${safeId(edge.target)}\n`;
  }

  return mermaid;
}
