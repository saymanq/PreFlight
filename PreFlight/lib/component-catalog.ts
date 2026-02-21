export type ComponentCategory =
    | "frontend"
    | "backend"
    | "data"
    | "auth"
    | "storage"
    | "ai"
    | "infra";

export interface ComponentDef {
    type: string;
    category: ComponentCategory;
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

export const CATEGORY_COLORS: Record<ComponentCategory, string> = {
    frontend: "#3b82f6",
    backend: "#22c55e",
    data: "#a855f7",
    auth: "#f59e0b",
    storage: "#06b6d4",
    ai: "#ec4899",
    infra: "#64748b",
};

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
    frontend: "Frontend",
    backend: "Backend",
    data: "Data",
    auth: "Auth",
    storage: "Storage",
    ai: "AI / ML",
    infra: "Infrastructure",
};

export const COMPONENT_CATALOG: ComponentDef[] = [
    // Frontend
    {
        type: "nextjs_app",
        category: "frontend",
        label: "Next.js Web App",
        provider: "vercel",
        icon: "Globe",
        description: "Full-stack React framework with server components, routing, and API routes",
        tags: ["ssr", "react", "serverless"],
        complexityHint: 2,
        costHint: "Free–Low",
        capabilities: ["ssr", "static_site", "api_routes", "middleware"],
        defaultConfig: { framework: "next.js", version: "14+", runtime: "node" },
        baseWeights: { buildSpeed: 3, complexity: -1, scalability: 2, opsBurden: -2, cost: -1, lockIn: 1, reliability: 2, aiReadiness: 1 },
    },
    {
        type: "react_spa",
        category: "frontend",
        label: "React SPA",
        provider: "generic",
        icon: "Monitor",
        description: "Client-side single page application built with React",
        tags: ["csr", "react"],
        complexityHint: 1,
        costHint: "Free",
        capabilities: ["client_rendering", "spa"],
        defaultConfig: { framework: "vite", bundler: "vite" },
        baseWeights: { buildSpeed: 3, complexity: -2, scalability: 1, opsBurden: -2, cost: -2, lockIn: 0, reliability: 1, aiReadiness: 0 },
    },
    {
        type: "mobile_app",
        category: "frontend",
        label: "Mobile App",
        provider: "generic",
        icon: "Smartphone",
        description: "Native or cross-platform mobile application",
        tags: ["mobile", "native"],
        complexityHint: 4,
        costHint: "Medium",
        capabilities: ["push_notifications", "offline", "native_apis"],
        defaultConfig: { framework: "react-native" },
        baseWeights: { buildSpeed: -2, complexity: 3, scalability: 1, opsBurden: 2, cost: 1, lockIn: 1, reliability: 1, aiReadiness: 0 },
    },

    // Backend
    {
        type: "convex_backend",
        category: "backend",
        label: "Convex Backend",
        provider: "convex",
        icon: "Server",
        description: "Serverless backend with reactive queries, mutations, actions, and built-in database",
        tags: ["serverless", "realtime", "reactive"],
        complexityHint: 1,
        costHint: "Free–Low",
        capabilities: ["realtime", "reactive_queries", "transactions", "scheduling", "file_storage"],
        defaultConfig: { tier: "free", realtime: true },
        baseWeights: { buildSpeed: 3, complexity: -2, scalability: 2, opsBurden: -3, cost: -1, lockIn: 2, reliability: 2, aiReadiness: 1 },
    },
    {
        type: "api_gateway",
        category: "backend",
        label: "API Gateway",
        provider: "generic",
        icon: "Network",
        description: "API gateway for routing, rate limiting, and request transformation",
        tags: ["api", "gateway", "routing"],
        complexityHint: 3,
        costHint: "Low–Medium",
        capabilities: ["rate_limiting", "routing", "auth_proxy"],
        defaultConfig: {},
        baseWeights: { buildSpeed: -1, complexity: 2, scalability: 2, opsBurden: 1, cost: 1, lockIn: 1, reliability: 1, aiReadiness: 0 },
    },
    {
        type: "worker",
        category: "backend",
        label: "Worker / Job Runner",
        provider: "generic",
        icon: "Cog",
        description: "Background job processor for async tasks",
        tags: ["async", "background", "jobs"],
        complexityHint: 3,
        costHint: "Low–Medium",
        capabilities: ["async_processing", "retries", "scheduling"],
        defaultConfig: {},
        baseWeights: { buildSpeed: -1, complexity: 2, scalability: 2, opsBurden: 1, cost: 1, lockIn: 0, reliability: 2, aiReadiness: 0 },
    },
    {
        type: "external_api",
        category: "backend",
        label: "External API",
        provider: "generic",
        icon: "ExternalLink",
        description: "Third-party API integration (Stripe, Twilio, etc.)",
        tags: ["integration", "third-party"],
        complexityHint: 2,
        costHint: "Varies",
        capabilities: ["external_data", "webhooks"],
        defaultConfig: { service: "" },
        baseWeights: { buildSpeed: 0, complexity: 1, scalability: 0, opsBurden: 1, cost: 1, lockIn: 1, reliability: -1, aiReadiness: 0 },
    },

    // Data
    {
        type: "convex_db",
        category: "data",
        label: "Convex Database",
        provider: "convex",
        icon: "Database",
        description: "Built-in document database with reactive subscriptions and ACID transactions",
        tags: ["document", "realtime", "reactive"],
        complexityHint: 1,
        costHint: "Free–Low",
        capabilities: ["reactive_queries", "transactions", "indexes", "full_text_search"],
        defaultConfig: { type: "document" },
        baseWeights: { buildSpeed: 3, complexity: -2, scalability: 2, opsBurden: -3, cost: -1, lockIn: 2, reliability: 2, aiReadiness: 1 },
    },
    {
        type: "postgres",
        category: "data",
        label: "PostgreSQL",
        provider: "generic",
        icon: "Database",
        description: "Relational database with ACID compliance, suitable for complex queries",
        tags: ["relational", "sql", "acid"],
        complexityHint: 3,
        costHint: "Low–Medium",
        capabilities: ["sql", "transactions", "joins", "full_text_search"],
        defaultConfig: { managed: true },
        baseWeights: { buildSpeed: 0, complexity: 1, scalability: 2, opsBurden: 1, cost: 1, lockIn: 0, reliability: 3, aiReadiness: 0 },
    },
    {
        type: "redis",
        category: "data",
        label: "Redis / Cache",
        provider: "generic",
        icon: "Zap",
        description: "In-memory data store used for caching, sessions, and pub/sub",
        tags: ["cache", "in-memory", "pub-sub"],
        complexityHint: 2,
        costHint: "Low",
        capabilities: ["caching", "sessions", "pub_sub", "rate_limiting"],
        defaultConfig: { managed: true },
        baseWeights: { buildSpeed: 0, complexity: 1, scalability: 2, opsBurden: 1, cost: 1, lockIn: 0, reliability: 1, aiReadiness: 0 },
    },
    {
        type: "vector_db",
        category: "data",
        label: "Vector Database",
        provider: "generic",
        icon: "Layers",
        description: "Specialized database for storing and querying vector embeddings",
        tags: ["ai", "embeddings", "semantic_search"],
        complexityHint: 3,
        costHint: "Low–Medium",
        capabilities: ["vector_search", "semantic_search", "embeddings_storage"],
        defaultConfig: {},
        baseWeights: { buildSpeed: -1, complexity: 2, scalability: 1, opsBurden: 1, cost: 1, lockIn: 1, reliability: 1, aiReadiness: 3 },
    },

    // Auth
    {
        type: "clerk_auth",
        category: "auth",
        label: "Clerk",
        provider: "clerk",
        icon: "Shield",
        description: "Drop-in authentication with social login, MFA, and user management",
        tags: ["auth", "social_login", "mfa"],
        complexityHint: 1,
        costHint: "Free–Low",
        capabilities: ["social_login", "mfa", "user_management", "rbac"],
        defaultConfig: { socialLogin: true },
        baseWeights: { buildSpeed: 3, complexity: -2, scalability: 1, opsBurden: -2, cost: 0, lockIn: 2, reliability: 2, aiReadiness: 0 },
    },
    {
        type: "auth0",
        category: "auth",
        label: "Auth0",
        provider: "auth0",
        icon: "Shield",
        description: "Enterprise-grade identity platform with extensible auth flows",
        tags: ["auth", "enterprise", "sso"],
        complexityHint: 2,
        costHint: "Free–Medium",
        capabilities: ["social_login", "mfa", "sso", "rbac", "enterprise"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 1, complexity: 1, scalability: 2, opsBurden: 0, cost: 1, lockIn: 2, reliability: 2, aiReadiness: 0 },
    },
    {
        type: "custom_auth",
        category: "auth",
        label: "Custom Auth",
        provider: "generic",
        icon: "Lock",
        description: "Self-built authentication system",
        tags: ["auth", "custom"],
        complexityHint: 5,
        costHint: "Low",
        capabilities: ["full_control"],
        defaultConfig: {},
        baseWeights: { buildSpeed: -3, complexity: 3, scalability: 0, opsBurden: 3, cost: -1, lockIn: -1, reliability: -1, aiReadiness: 0 },
    },

    // Storage
    {
        type: "convex_storage",
        category: "storage",
        label: "Convex File Storage",
        provider: "convex",
        icon: "HardDrive",
        description: "Built-in file storage with upload URLs and access control",
        tags: ["files", "serverless"],
        complexityHint: 1,
        costHint: "Free–Low",
        capabilities: ["file_upload", "access_control"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 3, complexity: -2, scalability: 1, opsBurden: -2, cost: 0, lockIn: 2, reliability: 1, aiReadiness: 0 },
    },
    {
        type: "s3_r2",
        category: "storage",
        label: "S3 / Cloudflare R2",
        provider: "aws/cloudflare",
        icon: "HardDrive",
        description: "Object storage for files, images, videos, and backups",
        tags: ["files", "object_storage", "cdn"],
        complexityHint: 2,
        costHint: "Low",
        capabilities: ["file_upload", "cdn", "large_files", "presigned_urls"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 0, complexity: 1, scalability: 3, opsBurden: 0, cost: 0, lockIn: 0, reliability: 3, aiReadiness: 0 },
    },

    // AI
    {
        type: "llm_provider",
        category: "ai",
        label: "LLM Provider",
        provider: "generic",
        icon: "Brain",
        description: "Large language model API (OpenAI, Google, Anthropic)",
        tags: ["ai", "llm", "generation"],
        complexityHint: 2,
        costHint: "Medium–High",
        capabilities: ["text_generation", "chat", "function_calling", "structured_output"],
        defaultConfig: { model: "gemini-3-flash-preview", sync: true },
        baseWeights: { buildSpeed: 1, complexity: 1, scalability: 0, opsBurden: 0, cost: 2, lockIn: 1, reliability: -1, aiReadiness: 3 },
    },
    {
        type: "embeddings_provider",
        category: "ai",
        label: "Embeddings Provider",
        provider: "generic",
        icon: "Layers",
        description: "Embedding model for converting text to vectors for semantic search",
        tags: ["ai", "embeddings", "search"],
        complexityHint: 2,
        costHint: "Low–Medium",
        capabilities: ["text_embeddings", "semantic_search"],
        defaultConfig: {},
        baseWeights: { buildSpeed: -1, complexity: 2, scalability: 1, opsBurden: 0, cost: 1, lockIn: 1, reliability: 0, aiReadiness: 3 },
    },
    {
        type: "moderation",
        category: "ai",
        label: "Moderation / Classification",
        provider: "generic",
        icon: "ShieldCheck",
        description: "Content moderation and text classification service",
        tags: ["ai", "moderation", "safety"],
        complexityHint: 2,
        costHint: "Low",
        capabilities: ["content_moderation", "classification"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 0, complexity: 1, scalability: 1, opsBurden: 0, cost: 1, lockIn: 0, reliability: 1, aiReadiness: 1 },
    },

    // Infrastructure
    {
        type: "queue",
        category: "infra",
        label: "Message Queue",
        provider: "generic",
        icon: "List",
        description: "Async message queue for decoupling services (SQS, RabbitMQ)",
        tags: ["async", "queue", "decoupling"],
        complexityHint: 3,
        costHint: "Low–Medium",
        capabilities: ["async_messaging", "decoupling", "retries", "dead_letter"],
        defaultConfig: {},
        baseWeights: { buildSpeed: -1, complexity: 2, scalability: 3, opsBurden: 1, cost: 1, lockIn: 1, reliability: 2, aiReadiness: 0 },
    },
    {
        type: "scheduler",
        category: "infra",
        label: "Cron / Scheduler",
        provider: "generic",
        icon: "Clock",
        description: "Periodic job scheduling for recurring tasks",
        tags: ["cron", "scheduling", "periodic"],
        complexityHint: 2,
        costHint: "Free–Low",
        capabilities: ["periodic_jobs", "scheduling"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 0, complexity: 1, scalability: 1, opsBurden: 1, cost: 0, lockIn: 0, reliability: 1, aiReadiness: 0 },
    },
    {
        type: "cdn",
        category: "infra",
        label: "CDN",
        provider: "generic",
        icon: "Globe",
        description: "Content delivery network for caching static assets globally",
        tags: ["cdn", "cache", "performance"],
        complexityHint: 1,
        costHint: "Free–Low",
        capabilities: ["static_caching", "edge_delivery", "ddos_protection"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 1, complexity: 0, scalability: 3, opsBurden: 0, cost: 0, lockIn: 0, reliability: 2, aiReadiness: 0 },
    },
    {
        type: "analytics",
        category: "infra",
        label: "Analytics",
        provider: "generic",
        icon: "BarChart3",
        description: "Application analytics and event tracking",
        tags: ["analytics", "tracking", "monitoring"],
        complexityHint: 1,
        costHint: "Free–Low",
        capabilities: ["event_tracking", "user_analytics", "funnels"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 1, complexity: 0, scalability: 1, opsBurden: 0, cost: 0, lockIn: 0, reliability: 0, aiReadiness: 0 },
    },
    {
        type: "monitoring",
        category: "infra",
        label: "Monitoring",
        provider: "generic",
        icon: "Activity",
        description: "Application monitoring, logging, and alerting",
        tags: ["monitoring", "logging", "alerting"],
        complexityHint: 2,
        costHint: "Free–Medium",
        capabilities: ["logging", "alerting", "error_tracking", "apm"],
        defaultConfig: {},
        baseWeights: { buildSpeed: 0, complexity: 1, scalability: 1, opsBurden: 0, cost: 1, lockIn: 0, reliability: 2, aiReadiness: 0 },
    },
];

export function getComponentByType(type: string): ComponentDef | undefined {
    return COMPONENT_CATALOG.find((c) => c.type === type);
}

export function getComponentsByCategory(category: ComponentCategory): ComponentDef[] {
    return COMPONENT_CATALOG.filter((c) => c.category === category);
}
