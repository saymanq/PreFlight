import { type ArchNode, type ArchEdge } from "./store";

interface LintIssue {
    code: string;
    severity: "error" | "warning" | "info";
    title: string;
    description: string;
    targets: string[];
    suggestedFix: string;
}

interface LintRule {
    code: string;
    severity: "error" | "warning" | "info";
    title: string;
    description: string;
    predicate: (
        nodes: ArchNode[],
        edges: ArchEdge[],
        constraints: Record<string, string>
    ) => boolean;
    targets: (nodes: ArchNode[], edges: ArchEdge[]) => string[];
    suggestedFix: string;
}

const LINT_RULES: LintRule[] = [
    // Critical
    {
        code: "SEC001",
        severity: "error",
        title: "No authentication for user data",
        description: "App has data storage but no auth node. User data may be unprotected.",
        predicate: (nodes) => {
            const hasData = nodes.some((n) => n.data.category === "data");
            const hasAuth = nodes.some((n) => n.data.category === "auth");
            return hasData && !hasAuth;
        },
        targets: (nodes) => nodes.filter((n) => n.data.category === "data").map((n) => n.id),
        suggestedFix: "Add an authentication provider (Clerk, Auth0, or Custom Auth)",
    },
    {
        code: "AI001",
        severity: "error",
        title: "AI feature without backend path",
        description: "AI node present but no backend/action path to process LLM calls.",
        predicate: (nodes, edges) => {
            const aiNodes = nodes.filter((n) => n.data.category === "ai");
            const backendNodes = nodes.filter((n) => n.data.category === "backend");
            if (aiNodes.length === 0) return false;
            if (backendNodes.length === 0) return true;
            // Check if any edge connects backend to AI
            const hasConnection = edges.some(
                (e) =>
                    (backendNodes.some((b) => b.id === e.source) && aiNodes.some((a) => a.id === e.target)) ||
                    (backendNodes.some((b) => b.id === e.target) && aiNodes.some((a) => a.id === e.source))
            );
            return !hasConnection;
        },
        targets: (nodes) => nodes.filter((n) => n.data.category === "ai").map((n) => n.id),
        suggestedFix: "Connect your backend to the AI provider via an edge",
    },
    {
        code: "STOR001",
        severity: "error",
        title: "No storage target for file uploads",
        description: "File storage or upload capability needed but no storage node present.",
        predicate: (nodes) => {
            const hasUploadTag = nodes.some((n) => n.data.tags?.includes("files") || n.data.tags?.includes("file_uploads"));
            const hasStorage = nodes.some((n) => n.data.category === "storage");
            return hasUploadTag && !hasStorage;
        },
        targets: (nodes) =>
            nodes.filter((n) => n.data.tags?.includes("files") || n.data.tags?.includes("file_uploads")).map((n) => n.id),
        suggestedFix: "Add a storage node (Convex File Storage, S3/R2)",
    },
    {
        code: "GRAPH001",
        severity: "error",
        title: "Disconnected component",
        description: "One or more nodes are completely disconnected from the architecture.",
        predicate: (nodes, edges) => {
            if (nodes.length <= 1) return false;
            const connected = new Set<string>();
            for (const e of edges) {
                connected.add(e.source);
                connected.add(e.target);
            }
            return nodes.some((n) => !connected.has(n.id));
        },
        targets: (nodes, edges) => {
            const connected = new Set<string>();
            for (const e of edges) {
                connected.add(e.source);
                connected.add(e.target);
            }
            return nodes.filter((n) => !connected.has(n.id)).map((n) => n.id);
        },
        suggestedFix: "Connect this node to the rest of the architecture or remove it",
    },

    // Warnings
    {
        code: "PERF001",
        severity: "warning",
        title: "No cache for read-heavy architecture",
        description: "Multiple data connections detected but no caching layer.",
        predicate: (nodes, edges) => {
            const dataNodes = nodes.filter((n) => n.data.category === "data");
            const dataEdges = edges.filter(
                (e) => dataNodes.some((d) => d.id === e.target || d.id === e.source)
            );
            const hasCache = nodes.some((n) => n.data.type === "redis");
            return dataEdges.length > 2 && !hasCache;
        },
        targets: (nodes) => nodes.filter((n) => n.data.category === "data").map((n) => n.id),
        suggestedFix: "Consider adding a Redis/Cache layer for frequently read data",
    },
    {
        code: "PERF002",
        severity: "warning",
        title: "LLM in request path without queue",
        description: "LLM calls are potentially synchronous without async processing.",
        predicate: (nodes) => {
            const hasLLM = nodes.some((n) => n.data.type === "llm_provider");
            const hasQueue = nodes.some((n) => n.data.type === "queue");
            return hasLLM && !hasQueue;
        },
        targets: (nodes) => nodes.filter((n) => n.data.type === "llm_provider").map((n) => n.id),
        suggestedFix: "Consider adding a queue for async LLM processing",
    },
    {
        code: "SEC002",
        severity: "warning",
        title: "No rate limiting",
        description: "Public API without rate limiting could be abused.",
        predicate: (nodes) => {
            const hasPublicAPI = nodes.some(
                (n) => n.data.type === "api_gateway" || n.data.type === "external_api"
            );
            return hasPublicAPI;
        },
        targets: (nodes) =>
            nodes.filter((n) => n.data.type === "api_gateway" || n.data.type === "external_api").map((n) => n.id),
        suggestedFix: "Add rate limiting to your API gateway",
    },
    {
        code: "ARCH001",
        severity: "warning",
        title: "Duplicate role nodes",
        description: "Multiple auth or database nodes of the same type detected.",
        predicate: (nodes) => {
            const authNodes = nodes.filter((n) => n.data.category === "auth");
            const dbNodes = nodes.filter((n) => n.data.category === "data" && n.data.type !== "redis" && n.data.type !== "vector_db");
            return authNodes.length > 1 || dbNodes.length > 2;
        },
        targets: (nodes) => {
            const authNodes = nodes.filter((n) => n.data.category === "auth");
            const dbNodes = nodes.filter((n) => n.data.category === "data");
            return authNodes.length > 1 ? authNodes.map((n) => n.id) : dbNodes.map((n) => n.id);
        },
        suggestedFix: "Consider consolidating to a single auth/database provider",
    },
    {
        code: "PERF003",
        severity: "warning",
        title: "No CDN for frontend",
        description: "Frontend application without CDN may have slow global delivery.",
        predicate: (nodes) => {
            const hasFrontend = nodes.some((n) => n.data.category === "frontend");
            const hasCDN = nodes.some((n) => n.data.type === "cdn");
            return hasFrontend && !hasCDN && nodes.length > 4;
        },
        targets: (nodes) => nodes.filter((n) => n.data.category === "frontend").map((n) => n.id),
        suggestedFix: "Consider adding a CDN for static asset delivery",
    },
    {
        code: "AI002",
        severity: "warning",
        title: "Vector search without embeddings pipeline",
        description: "Vector DB present but no embeddings provider to generate vectors.",
        predicate: (nodes) => {
            const hasVectorDB = nodes.some((n) => n.data.type === "vector_db");
            const hasEmbeddings = nodes.some((n) => n.data.type === "embeddings_provider");
            return hasVectorDB && !hasEmbeddings;
        },
        targets: (nodes) => nodes.filter((n) => n.data.type === "vector_db").map((n) => n.id),
        suggestedFix: "Add an Embeddings Provider to generate vectors for search",
    },

    // Info
    {
        code: "DX001",
        severity: "info",
        title: "Consider observability",
        description: "No monitoring or analytics node detected.",
        predicate: (nodes) => {
            const hasObservability = nodes.some(
                (n) => n.data.type === "monitoring" || n.data.type === "analytics"
            );
            return nodes.length > 3 && !hasObservability;
        },
        targets: () => [],
        suggestedFix: "Add monitoring and/or analytics for production readiness",
    },
    {
        code: "DX002",
        severity: "info",
        title: "Consider scheduled jobs",
        description: "No cron/scheduler detected. Periodic tasks may be needed.",
        predicate: (nodes) => {
            const hasScheduler = nodes.some((n) => n.data.type === "scheduler");
            return nodes.length > 5 && !hasScheduler;
        },
        targets: () => [],
        suggestedFix: "Add a scheduler for periodic maintenance tasks",
    },
    {
        code: "SCOPE001",
        severity: "info",
        title: "Large architecture for hackathon",
        description: "Architecture has many components, which may be challenging for a hackathon timeline.",
        predicate: (nodes, _edges, constraints) => {
            return constraints.timeline === "hackathon" && nodes.length > 6;
        },
        targets: () => [],
        suggestedFix: "Consider reducing scope for hackathon — focus on core features",
    },
    {
        code: "DX003",
        severity: "info",
        title: "Single team member with complex stack",
        description: "Complex architecture with solo developer may be challenging.",
        predicate: (nodes, _edges, constraints) => {
            return constraints.teamSize === "1" && nodes.length > 5;
        },
        targets: () => [],
        suggestedFix: "Consider simplifying or using more managed services",
    },
    {
        code: "ARCH002",
        severity: "info",
        title: "No persistence layer",
        description: "Architecture has no data storage — state will be lost.",
        predicate: (nodes) => {
            const hasData = nodes.some((n) => n.data.category === "data");
            return nodes.length > 1 && !hasData;
        },
        targets: () => [],
        suggestedFix: "Add a database for persistent data storage",
    },
];

export function runLint(
    nodes: ArchNode[],
    edges: ArchEdge[],
    constraints: Record<string, string>
): LintIssue[] {
    if (nodes.length === 0) return [];

    const issues: LintIssue[] = [];

    for (const rule of LINT_RULES) {
        if (rule.predicate(nodes, edges, constraints)) {
            issues.push({
                code: rule.code,
                severity: rule.severity,
                title: rule.title,
                description: rule.description,
                targets: rule.targets(nodes, edges),
                suggestedFix: rule.suggestedFix,
            });
        }
    }

    // Sort by severity: error > warning > info
    const severityOrder = { error: 0, warning: 1, info: 2 };
    issues.sort((a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]);

    return issues;
}
