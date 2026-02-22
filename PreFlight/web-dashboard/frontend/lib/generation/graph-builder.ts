import { generateId } from "@/lib/utils";
import { getComponentById, COMPONENT_LIBRARY } from "@/lib/components-data";

interface BuiltNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    componentId: string;
    category: string;
    icon: string;
    color: string;
  };
}

interface BuiltEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  sourceHandle?: string;
  targetHandle?: string;
}

const LAYER_Y: Record<string, number> = {
  frontend: 80,
  auth: 230,
  backend: 380,
  ml: 380,
  queue: 530,
  cache: 530,
  database: 680,
  storage: 680,
  search: 680,
  monitoring: 830,
  hosting: 830,
  cicd: 830,
};

function findComponentData(componentId: string) {
  for (const cat of COMPONENT_LIBRARY) {
    const comp = cat.components.find((c) => c.id === componentId);
    if (comp) return { component: comp, categoryId: cat.id };
  }
  return null;
}

export function buildGraphFromComponentIds(
  componentIds: string[]
): { nodes: BuiltNode[]; edges: BuiltEdge[] } {
  const nodes: BuiltNode[] = [];
  const layerCounters: Record<string, number> = {};

  for (const cid of componentIds) {
    const data = findComponentData(cid);
    if (!data) continue;

    const category = data.categoryId;
    const y = LAYER_Y[category] || 500;
    const xCount = layerCounters[category] || 0;
    layerCounters[category] = xCount + 1;
    const x = 180 + xCount * 260;

    nodes.push({
      id: `${cid}-${generateId()}`,
      type: "custom",
      position: { x, y },
      data: {
        label: data.component.name,
        componentId: cid,
        category,
        icon: data.component.icon,
        color: data.component.color,
      },
    });
  }

  const edges: BuiltEdge[] = [];
  const byCategory = (cat: string) => nodes.filter((n) => n.data.category === cat);

  function connect(srcCat: string, tgtCat: string) {
    for (const s of byCategory(srcCat)) {
      for (const t of byCategory(tgtCat)) {
        edges.push({
          id: generateId(),
          source: s.id,
          target: t.id,
          type: "custom",
          sourceHandle: "bottom",
          targetHandle: "top",
        });
      }
    }
  }

  connect("frontend", "backend");
  connect("backend", "database");
  connect("backend", "auth");
  connect("backend", "cache");
  connect("backend", "ml");
  connect("backend", "storage");
  connect("backend", "queue");
  connect("backend", "search");

  for (const fe of byCategory("frontend")) {
    for (const h of byCategory("hosting").filter((n) => ["vercel", "netlify"].includes(n.data.componentId))) {
      edges.push({ id: generateId(), source: fe.id, target: h.id, type: "custom", sourceHandle: "bottom", targetHandle: "top" });
    }
  }
  for (const be of byCategory("backend")) {
    for (const h of byCategory("hosting").filter((n) => ["railway", "render", "cloudrun", "aws-ec2", "gcp-compute"].includes(n.data.componentId))) {
      edges.push({ id: generateId(), source: be.id, target: h.id, type: "custom", sourceHandle: "bottom", targetHandle: "top" });
    }
  }

  return { nodes, edges };
}
