import { ALL_COMPONENTS, type ComponentMeta } from "./scoring/component-weights";

export interface ComponentDefinition {
    id: string;
    name: string;
    icon: string;
    color: string;
    description?: string;
    baseCost?: number;
}

export interface ComponentCategory {
    id: string;
    name: string;
    icon: string;
    components: ComponentDefinition[];
}

const logo = (slug: string) =>
    `https://cdn.simpleicons.org/${slug}`;

const KNOWN_COLORS: Record<string, string> = {
    react: "#61dafb", nextjs: "#000000", remix: "#000000", gatsby: "#663399",
    vue: "#42b883", nuxt: "#00dc82", svelte: "#ff3e00", sveltekit: "#ff3e00",
    angular: "#dd0031", solid: "#2c4f7c", astro: "#ff5d01", qwik: "#0080ff",
    htmx: "#3366cc", alpinejs: "#77c1d2", preact: "#673ab8", ember: "#e04e39",
    lit: "#324fff", stencil: "#000000", vite: "#646cff", webpack: "#8dd6f9",
    turbopack: "#000000", esbuild: "#ffcf00", tailwindcss: "#06b6d4",
    shadcn: "#000000", "chakra-ui": "#319795", mui: "#007fff",
    "ant-design": "#1677ff", radix: "#000000", bootstrap: "#7952b3",
    "styled-components": "#db7093", "framer-motion": "#0055ff", gsap: "#88ce02",
    threejs: "#000000", r3f: "#000000", zustand: "#433b2e", redux: "#764abc",
    "tanstack-query": "#ff4154", jotai: "#000000", d3: "#f9a03c",
    recharts: "#61dafb", chartjs: "#ff6384",

    express: "#000000", nestjs: "#e0234e", fastify: "#000000", hono: "#e36002",
    trpc: "#2596be", deno: "#000000", bun: "#fbf0df", fastapi: "#009688",
    django: "#092e20", flask: "#000000", litestar: "#3776ab",
    "go-gin": "#00add8", "go-fiber": "#00add8", "go-echo": "#00add8",
    "actix-web": "#000000", axum: "#000000",
    "spring-boot": "#6db33f", quarkus: "#4695eb", ktor: "#7f52ff",
    rails: "#cc0000", laravel: "#ff2d20", symfony: "#000000",
    aspnet: "#512bd4", phoenix: "#fd4f00",
    convex: "#f3722c", supabase: "#3ecf8e", firebase: "#ffca28",
    appwrite: "#fd366e", pocketbase: "#b8dbe4", nhost: "#0d9488",

    postgresql: "#4169e1", mysql: "#4479a1", mariadb: "#003545",
    sqlite: "#003b57", turso: "#4ff8d2", cockroachdb: "#6933ff",
    planetscale: "#000000", neon: "#00e599", mongodb: "#47a248",
    couchdb: "#e42528", redis: "#dc382d", valkey: "#0d47a1",
    dragonfly: "#6c47ff", memcached: "#000000",
    cassandra: "#1287b1", scylladb: "#6cd5eb", neo4j: "#008cc1",
    dgraph: "#e50695", timescaledb: "#fdb515", influxdb: "#22adf6",
    clickhouse: "#ffcc21", dynamodb: "#4053d6", "cosmos-db": "#0078d4",
    "cloud-spanner": "#4285f4", pinecone: "#000000", weaviate: "#01c6b2",
    qdrant: "#dc244c", chroma: "#000000", milvus: "#00a1ea",
    pgvector: "#4169e1", surrealdb: "#ff00a0", tigerbeetle: "#ff8c00",

    clerk: "#6c47ff", auth0: "#eb5424", "firebase-auth": "#ffca28",
    "supabase-auth": "#3ecf8e", nextauth: "#000000", lucia: "#5f57ff",
    keycloak: "#4d4d4d", cognito: "#ff9900", stytch: "#19303d",
    workos: "#6363f1",

    openai: "#10a37f", anthropic: "#d4a574", "google-gemini": "#886fff",
    deepseek: "#0066ff", groq: "#f55036", "together-ai": "#000000",
    replicate: "#000000", ollama: "#000000", vllm: "#000000",
    pytorch: "#ee4c2c", tensorflow: "#ff6f00", jax: "#4285f4",
    huggingface: "#ffcc00", langchain: "#1c3c3c", llamaindex: "#000000",
    "vercel-ai-sdk": "#000000", crewai: "#000000", autogen: "#0078d4",
    "openai-agents-sdk": "#10a37f", mcp: "#d4a574",
    opencv: "#5c3ee8", elevenlabs: "#000000", whisper: "#10a37f",
    deepgram: "#13ef93",

    "react-native": "#61dafb", expo: "#000020", flutter: "#02569b",
    "swift-ios": "#f05138", "kotlin-android": "#7f52ff",
    "kotlin-multiplatform": "#7f52ff", capacitor: "#119eff",
    "tauri-mobile": "#ffc131",

    electron: "#47848f", tauri: "#ffc131", wails: "#00add8",
    "dotnet-maui": "#512bd4", qt: "#41cd52",

    vercel: "#000000", netlify: "#00c7b7", railway: "#0b0d0e",
    render: "#46e3b7", "fly-io": "#7b3fe4", coolify: "#6f42c1",
    aws: "#ff9900", gcp: "#4285f4", azure: "#0078d4",
    "cloudflare-workers": "#f38020", "aws-lambda": "#ff9900",
    "google-cloud-run": "#4285f4", docker: "#2496ed",
    kubernetes: "#326ce5",

    stripe: "#635bff", lemonsqueezy: "#ffc233", paddle: "#000000",

    kafka: "#231f20", rabbitmq: "#ff6600", sqs: "#ff9900",
    bullmq: "#dc382d", nats: "#27aae1", inngest: "#5d5fef",
    temporal: "#000000",

    elasticsearch: "#005571", algolia: "#5468ff",
    meilisearch: "#ff5caa", typesense: "#d32f2f",

    sentry: "#362d59", datadog: "#632ca6", grafana: "#f46800",
    prometheus: "#e6522c", posthog: "#1d4aff", betterstack: "#3bc98e",

    "github-actions": "#2088ff", "gitlab-ci": "#fc6d26",
    "vercel-deploy": "#000000", turborepo: "#000000", nx: "#143055",

    s3: "#569a31", "cloudflare-r2": "#f38020", uploadthing: "#eb2525",

    sanity: "#f03e2f", contentful: "#2478cc", strapi: "#4945ff",
    payload: "#000000", wordpress: "#21759b",

    pusher: "#300d4f", ably: "#03020d", socketio: "#010101",
    livekit: "#000000",

    resend: "#000000", sendgrid: "#1a82e2", postmark: "#ffde00",

    vitest: "#6e9f18", jest: "#c21325", playwright: "#2ead33",
    cypress: "#69d3a7", storybook: "#ff4785", pytest: "#0a9edc",

    graphql: "#e10098", grpc: "#244c5a", prisma: "#2d3748",
    drizzle: "#c5f74f", hasura: "#1eb4d4",

    solidity: "#363636", hardhat: "#fff100", thirdweb: "#f213a4",
    wagmi: "#1e1e20",

    unity: "#000000", unreal: "#000000", godot: "#478cbf",

    "aws-iot": "#ff9900", mosquitto: "#3c5280", "home-assistant": "#41bdf5",
};

const CATEGORY_META: Record<string, { name: string; icon: string }> = {
    frontend: { name: "Frontend", icon: "palette" },
    backend: { name: "Backend", icon: "server" },
    database: { name: "Database", icon: "database" },
    auth: { name: "Authentication", icon: "lock" },
    ai: { name: "AI / ML", icon: "brain" },
    mobile: { name: "Mobile", icon: "smartphone" },
    desktop: { name: "Desktop", icon: "monitor" },
    hosting: { name: "Cloud & Hosting", icon: "cloud" },
    payments: { name: "Payments", icon: "credit-card" },
    messaging: { name: "Messaging & Queues", icon: "mail" },
    search: { name: "Search", icon: "search" },
    monitoring: { name: "Monitoring", icon: "activity" },
    cicd: { name: "CI/CD", icon: "refresh-cw" },
    storage: { name: "Storage", icon: "hard-drive" },
    cms: { name: "CMS", icon: "file-text" },
    realtime: { name: "Realtime", icon: "radio" },
    email: { name: "Email", icon: "at-sign" },
    testing: { name: "Testing", icon: "check-circle" },
    api: { name: "API & ORM", icon: "link" },
    blockchain: { name: "Blockchain", icon: "hexagon" },
    gaming: { name: "Game Dev", icon: "gamepad-2" },
    iot: { name: "IoT", icon: "wifi" },
};

const CATEGORY_ORDER = [
    "frontend", "backend", "database", "hosting", "ai", "auth",
    "mobile", "desktop", "payments", "messaging", "search",
    "monitoring", "cicd", "storage", "cms", "realtime", "email",
    "testing", "api", "blockchain", "gaming", "iot",
];

function metaToDef(m: ComponentMeta): ComponentDefinition {
    const slug = m.icon;
    const isEmoji = slug.length <= 3 && !slug.match(/^[a-z]/);
    const iconUrl = isEmoji ? slug : logo(slug);
    const color = KNOWN_COLORS[m.key] ?? "#6b7280";
    return {
        id: m.key,
        name: m.name,
        icon: iconUrl,
        color,
        description: m.description,
        baseCost: m.scores.cost,
    };
}

function buildLibrary(): ComponentCategory[] {
    const grouped = new Map<string, ComponentMeta[]>();
    for (const comp of ALL_COMPONENTS) {
        if (!grouped.has(comp.category)) grouped.set(comp.category, []);
        grouped.get(comp.category)!.push(comp);
    }

    const result: ComponentCategory[] = [];
    for (const catId of CATEGORY_ORDER) {
        const items = grouped.get(catId);
        if (!items || items.length === 0) continue;
        const meta = CATEGORY_META[catId] ?? { name: catId, icon: "box" };
        result.push({
            id: catId,
            name: meta.name,
            icon: meta.icon,
            components: items.map(metaToDef),
        });
    }
    return result;
}

export const COMPONENT_LIBRARY: ComponentCategory[] = buildLibrary();

export function getComponentById(id: string): ComponentDefinition | undefined {
    for (const category of COMPONENT_LIBRARY) {
        const component = category.components.find((c) => c.id === id);
        if (component) return component;
    }
    return undefined;
}

export function getCategoryById(id: string): ComponentCategory | undefined {
    return COMPONENT_LIBRARY.find((cat) => cat.id === id);
}
