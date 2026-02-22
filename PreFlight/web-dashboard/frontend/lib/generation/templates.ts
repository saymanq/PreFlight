export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  components: string[];
  features: string[];
}

export const ARCHITECTURE_TEMPLATES: ArchitectureTemplate[] = [
  {
    id: "saas",
    name: "SaaS App",
    description: "Full-stack SaaS with auth, database, and hosting",
    components: ["nextjs", "fastapi", "postgresql", "clerk", "vercel", "sentry", "github-actions"],
    features: ["auth", "analytics"],
  },
  {
    id: "rag_chat",
    name: "AI Chat / RAG",
    description: "AI chatbot with retrieval-augmented generation",
    components: ["nextjs", "fastapi", "postgresql", "openai", "redis-cache", "vercel"],
    features: ["ai_chat", "rag", "auth"],
  },
  {
    id: "marketplace",
    name: "Marketplace",
    description: "Two-sided marketplace with payments",
    components: ["nextjs", "express", "postgresql", "clerk", "s3", "redis-cache", "vercel", "sentry"],
    features: ["auth", "payments", "search", "file_upload"],
  },
  {
    id: "realtime",
    name: "Realtime App",
    description: "Collaborative/realtime application",
    components: ["nextjs", "express", "redis", "postgresql", "clerk", "vercel"],
    features: ["auth", "realtime", "chat"],
  },
  {
    id: "internal_tool",
    name: "Internal Tool",
    description: "Admin dashboard with API backend",
    components: ["react", "fastapi", "postgresql", "jwt", "railway"],
    features: ["auth", "analytics"],
  },
  {
    id: "api_backend",
    name: "API Backend",
    description: "REST/GraphQL API service",
    components: ["fastapi", "postgresql", "redis-cache", "railway", "github-actions"],
    features: ["auth"],
  },
  {
    id: "mobile_backend",
    name: "Mobile + API",
    description: "Mobile app backend with push notifications",
    components: ["fastapi", "postgresql", "firebase", "s3", "sqs", "cloudrun"],
    features: ["auth", "notifications", "file_upload"],
  },
  {
    id: "data_pipeline",
    name: "Data Pipeline",
    description: "ETL / data processing pipeline",
    components: ["fastapi", "postgresql", "kafka", "s3", "redis-cache", "prometheus"],
    features: ["analytics"],
  },
];
