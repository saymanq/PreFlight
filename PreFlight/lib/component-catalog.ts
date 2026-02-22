import {
    ALL_COMPONENTS,
    type ComponentMeta,
    getProviderForComponent,
} from "./scoring/component-weights";

export type ComponentCategory =
    | "frontend"
    | "backend"
    | "data"
    | "auth"
    | "storage"
    | "ai"
    | "infra"
    | "deployment"
    | "observability"
    | "mobile"
    | "desktop"
    | "payments"
    | "realtime"
    | "testing"
    | "api";

export const CATEGORY_ORDER: ComponentCategory[] = [
    "frontend",
    "backend",
    "data",
    "auth",
    "storage",
    "ai",
    "mobile",
    "desktop",
    "infra",
    "deployment",
    "observability",
    "payments",
    "realtime",
    "testing",
    "api",
];

export interface ComponentDef {
    type: string;
    category: ComponentCategory;
    subcategory?: string;
    label: string;
    provider: string;
    icon: string;
    description: string;
    tags: string[];
    complexityHint: number;
    costHint: string;
    capabilities: string[];
    defaultConfig: Record<string, unknown>;
    baseWeights: {
        buildSpeed: number;
        complexity: number;
        scalability: number;
        opsBurden: number;
        cost: number;
        lockIn: number;
        reliability: number;
        aiReadiness: number;
    };
}

const WEIGHT_CATEGORY_MAP: Record<string, ComponentCategory> = {
    frontend: "frontend",
    backend: "backend",
    database: "data",
    auth: "auth",
    ai: "ai",
    mobile: "mobile",
    desktop: "desktop",
    hosting: "deployment",
    payments: "payments",
    messaging: "infra",
    search: "data",
    monitoring: "observability",
    cicd: "deployment",
    storage: "storage",
    cms: "backend",
    realtime: "realtime",
    email: "backend",
    testing: "testing",
    api: "api",
    blockchain: "backend",
    gaming: "frontend",
    iot: "infra",
};

function complexityFromScores(m: ComponentMeta): number {
    return Math.min(5, Math.max(1, Math.round(m.scores.complexity * 0.5)));
}

function costHintFromScores(m: ComponentMeta): string {
    const c = m.scores.cost;
    if (c === 0) return "Free";
    if (c <= 10) return "Low";
    if (c <= 30) return "Low-Medium";
    if (c <= 50) return "Medium";
    return "Medium-High";
}

function metaToCatalogDef(m: ComponentMeta): ComponentDef {
    return {
        type: m.key,
        category: WEIGHT_CATEGORY_MAP[m.category] ?? "infra",
        subcategory: m.subcategory,
        label: m.name,
        provider: getProviderForComponent(m.key),
        icon: m.icon,
        description: m.description,
        tags: [...m.bestFor.slice(0, 3), ...m.languages.slice(0, 2)].map((t) =>
            t.toLowerCase().replace(/\s+/g, "_")
        ),
        complexityHint: complexityFromScores(m),
        costHint: costHintFromScores(m),
        capabilities: m.bestFor.slice(0, 4),
        defaultConfig: {},
        baseWeights: {
            buildSpeed: m.scores.buildSpeed,
            complexity: m.scores.complexity,
            scalability: m.scores.scalability,
            opsBurden: m.scores.opsBurden,
            cost: m.scores.cost,
            lockIn: m.scores.lockIn,
            reliability: m.scores.reliability,
            aiReadiness: m.scores.aiReadiness,
        },
    };
}

export const COMPONENT_CATALOG: ComponentDef[] = ALL_COMPONENTS.map(metaToCatalogDef);

export const CATEGORY_COLORS: Record<ComponentCategory, string> = {
    frontend: "#3b82f6",
    backend: "#22c55e",
    data: "#a855f7",
    auth: "#f59e0b",
    storage: "#06b6d4",
    ai: "#ec4899",
    mobile: "#f97316",
    desktop: "#64748b",
    infra: "#64748b",
    deployment: "#10b981",
    observability: "#f97316",
    payments: "#8b5cf6",
    realtime: "#14b8a6",
    testing: "#84cc16",
    api: "#6366f1",
};

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
    frontend: "Frontend",
    backend: "Backend",
    data: "Data",
    auth: "Auth",
    storage: "Storage",
    ai: "AI / ML",
    mobile: "Mobile",
    desktop: "Desktop",
    infra: "Infrastructure",
    deployment: "Deployment",
    observability: "Observability",
    payments: "Payments",
    realtime: "Realtime",
    testing: "Testing",
    api: "API & ORM",
};

export function getComponentByType(type: string): ComponentDef | undefined {
    return COMPONENT_CATALOG.find((c) => c.type === type);
}

export function getComponentsByCategory(category: ComponentCategory): ComponentDef[] {
    return COMPONENT_CATALOG.filter((c) => c.category === category);
}
