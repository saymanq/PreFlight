interface GNode { id: string; data?: { label?: string; category?: string; componentId?: string } }
interface GEdge { id: string; source: string; target: string }

export interface PromptPackItem {
  id: string;
  title: string;
  targetTool: "cursor" | "claude_code" | "lovable" | "generic";
  prompt: string;
  expectedFiles: string[];
  acceptanceCriteria: string[];
}

export function generatePromptPack(
  nodes: GNode[],
  edges: GEdge[],
  projectName: string,
  features: string[]
): PromptPackItem[] {
  const prompts: PromptPackItem[] = [];

  const techStack = nodes.map((n) => n.data?.label || "").filter(Boolean);
  const categories = [...new Set(nodes.map((n) => n.data?.category).filter(Boolean))];

  prompts.push({
    id: "scaffold",
    title: "1. Project Scaffold",
    targetTool: "cursor",
    prompt: `Create a new project called "${projectName}" with this tech stack: ${techStack.join(", ")}.

Set up:
- Project structure with proper folder organization
- Package dependencies for all services
- Environment variable templates (.env.example)
- Basic configuration files
- README with setup instructions

Categories to set up: ${categories.join(", ")}`,
    expectedFiles: ["package.json", ".env.example", "README.md"],
    acceptanceCriteria: ["Project installs without errors", "Dev server starts"],
  });

  const hasDB = nodes.some((n) => n.data?.category === "database");
  if (hasDB) {
    const dbNodes = nodes.filter((n) => n.data?.category === "database");
    prompts.push({
      id: "database",
      title: "2. Database Setup",
      targetTool: "cursor",
      prompt: `Set up the database layer using ${dbNodes.map((n) => n.data?.label).join(", ")}.

Create:
- Database connection configuration
- Schema / migrations for core data models
- Basic CRUD operations
- Connection pooling if applicable`,
      expectedFiles: ["schema file", "db connection file"],
      acceptanceCriteria: ["Database connects successfully", "Can create and read records"],
    });
  }

  const hasAuth = nodes.some((n) => n.data?.category === "auth");
  if (hasAuth) {
    const authNodes = nodes.filter((n) => n.data?.category === "auth");
    prompts.push({
      id: "auth",
      title: `${prompts.length + 1}. Authentication`,
      targetTool: "cursor",
      prompt: `Implement authentication using ${authNodes.map((n) => n.data?.label).join(", ")}.

Set up:
- Auth provider integration
- Protected routes / middleware
- User session management
- Sign in / sign up flows`,
      expectedFiles: ["auth middleware", "auth provider config"],
      acceptanceCriteria: ["Can sign up and sign in", "Protected routes redirect unauthenticated users"],
    });
  }

  for (const feature of features) {
    prompts.push({
      id: `feature_${feature}`,
      title: `${prompts.length + 1}. ${feature}`,
      targetTool: "cursor",
      prompt: `Implement the "${feature}" feature for ${projectName}.

Available services: ${techStack.join(", ")}

Implement with proper error handling, loading states, and type safety.`,
      expectedFiles: [],
      acceptanceCriteria: [`${feature} works end-to-end`],
    });
  }

  prompts.push({
    id: "deploy",
    title: `${prompts.length + 1}. Deployment`,
    targetTool: "cursor",
    prompt: `Deploy ${projectName}:
1. Push to GitHub
2. Set up CI/CD
3. Configure environment variables in production
4. Deploy and verify production URL`,
    expectedFiles: [],
    acceptanceCriteria: ["App accessible at production URL"],
  });

  return prompts;
}
