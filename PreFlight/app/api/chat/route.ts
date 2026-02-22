import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import {
    COMPONENT_CATALOG,
    CATEGORY_ORDER,
    CATEGORY_LABELS,
    type ComponentDef,
    type ComponentCategory,
} from "@/lib/component-catalog";
import { ALL_COMPONENTS } from "@/lib/scoring/component-weights";
import {
    FAST_OUTPUT_TOKENS,
    LOW_REASONING_PROVIDER_OPTIONS,
} from "@/lib/ai/google-generation";

const META_BY_KEY = new Map(ALL_COMPONENTS.map((m) => [m.key, m]));

function buildCompactCatalog(): string {
    const grouped = new Map<ComponentCategory, ComponentDef[]>();
    for (const c of COMPONENT_CATALOG) {
        const list = grouped.get(c.category) ?? [];
        list.push(c);
        grouped.set(c.category, list);
    }

    const sections: string[] = [];
    for (const cat of CATEGORY_ORDER) {
        const items = grouped.get(cat);
        if (!items?.length) continue;
        const label = CATEGORY_LABELS[cat] ?? cat;
        const lines = items.map((c) => {
            const meta = META_BY_KEY.get(c.type);
            const s = c.baseWeights;
            const scoreStr = `build=${s.buildSpeed} complex=${s.complexity} scale=${s.scalability} cost=${s.cost} ops=${s.opsBurden} lock=${s.lockIn} rel=${s.reliability} ai=${s.aiReadiness}`;
            const bestFor = meta?.bestFor?.slice(0, 3).join(", ") ?? "";
            const avoidWhen = meta?.avoidWhen?.slice(0, 2).join(", ") ?? "";
            const tier = meta?.tier ?? "";
            const maturity = meta?.maturity ?? "";
            return `  ${c.type} | ${c.label} | ${c.provider} | ${tier}/${maturity} | ${scoreStr} | best: ${bestFor} | avoid: ${avoidWhen}`;
        });
        sections.push(`[${label}]\n${lines.join("\n")}`);
    }
    return sections.join("\n\n");
}

const CATALOG_BLOCK = buildCompactCatalog();

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        const cleanIdeaMessage = (content: string) =>
            content
                .replace(/```extracted\s*\r?\n[\s\S]*?```\s*/gi, "")
                .replace(/\[READY_TO_GENERATE\]\s*/g, "")
                .trim();

        let systemPrompt = `You are the **PreFlight AI Architect** — an expert, agentic system-design partner.

═══ CORE IDENTITY ═══
You think like a principal engineer + CTO advisor. Every recommendation must weigh:
  • Long-term scalability — will it handle 10×–100× growth?
  • Cost efficiency — total cost of ownership (infra + dev-hours + ops)
  • Latency & performance — P95 response times, cold starts, edge proximity
  • Developer velocity — build speed, DX, hiring pool
  • Reliability — uptime SLAs, failure modes, blast radius
  • Vendor lock-in — migration effort, open-source alternatives
  • AI-readiness — can it integrate AI/ML pipelines natively?

═══ AGENTIC PLANNING PROTOCOL ═══
You operate as a collaborative architect. Follow this workflow:

1. **UNDERSTAND** — Before making any canvas change, restate what you think the user wants in 1-2 sentences. Ask clarifying questions if the request is ambiguous.

2. **ANALYZE** — For the current canvas state:
   - Identify gaps, redundancies, or anti-patterns.
   - Consider how existing components interact (data flow, auth boundaries, latency paths).

3. **PROPOSE** — Present your plan as a concise bullet list BEFORE executing:
   - What components to add/remove/replace and why.
   - Trade-offs between alternatives (e.g., "Supabase vs PlanetScale: Supabase is faster to ship but PlanetScale scales better for write-heavy workloads").
   - Expected impact on scores (cost, scalability, complexity).
   
4. **CONFIRM** — If the changes are significant (3+ components, replacing core infra, or major architectural shifts), ask the user to confirm before executing. For small changes (1-2 components, adding a utility service), proceed directly.

5. **EXECUTE** — Emit canvas actions and explain what changed.

6. **REVIEW** — After changes, briefly assess the new architecture state: "Your architecture now covers X, Y, Z. Consider adding W for production readiness."

═══ RECOMMENDATION GUIDELINES ═══
When suggesting components:
- Always explain WHY this component over alternatives for the user's specific use case.
- Reference the component's scores: "Next.js (buildSpeed=9, scalability=8) ships faster than Remix for most teams."
- Flag risks: if a component has high lock-in (>7) or ops-burden (>7), warn the user.
- For cost-sensitive projects, prefer open-source/free-tier components.
- For enterprise projects, prioritize reliability (>7) and scalability (>8).
- When the user asks to "build X", suggest a complete stack, not just one component.
- Proactively suggest complementary components: if they add a database, suggest a caching layer; if they add auth, suggest rate limiting.

═══ COMPONENT SCORING REFERENCE ═══
All scores are 1-10:
  buildSpeed   → How fast to ship v1 (10 = drop-in)
  complexity   → Learning curve / moving parts (10 = very complex)
  scalability  → Handles 10×-100× growth (10 = planet-scale)
  cost         → Monthly USD at moderate usage (raw number, 0 = free)
  opsBurden    → Maintenance / DevOps effort (10 = needs full-time SRE)
  lockIn       → Vendor dependency (10 = impossible to migrate)
  reliability  → Uptime / fault tolerance (10 = five 9s)
  aiReadiness  → Native AI/ML support (10 = AI-first)`;

        if ((context?.priorIdeaMessages?.length ?? 0) > 0) {
            const priorConversation = context.priorIdeaMessages
                .slice(-12)
                .map((m: { role: "user" | "assistant"; content: string }) => {
                    const roleLabel = m.role === "user" ? "User" : "Assistant";
                    return `- ${roleLabel}: ${cleanIdeaMessage(m.content)}`;
                })
                .join("\n");

            systemPrompt += `\n\n═══ PRIOR DISCOVERY CONVERSATION ═══\n${priorConversation}`;
        }

        if (context?.nodes?.length > 0) {
            const nodeDetails = context.nodes.map((n: { id: string; label: string; type: string; category: string; provider: string }) => {
                const meta = META_BY_KEY.get(n.type);
                const scoreHint = meta
                    ? ` [scale=${meta.scores.scalability} cost=${meta.scores.cost} rel=${meta.scores.reliability}]`
                    : "";
                return `  ${n.id}: ${n.label} (${n.type}, ${n.category}, ${n.provider})${scoreHint}`;
            }).join("\n");

            const edgeDetails = (context.edges ?? []).map((e: { id?: string; source: string; target: string; type: string }) =>
                `  ${e.source} → ${e.target} (${e.type})`
            ).join("\n");

            systemPrompt += `\n\n═══ CURRENT CANVAS STATE ═══
Components (${context.nodes.length}):
${nodeDetails}

Connections (${context.edges?.length ?? 0}):
${edgeDetails || "  (none)"}`;
        } else {
            systemPrompt += `\n\n═══ CURRENT CANVAS STATE ═══
The canvas is empty. Help the user get started by understanding their project goals, then suggest a complete architecture stack.`;
        }

        if (context?.scores && Object.keys(context.scores).length > 0) {
            const scoreSummary = Object.entries(context.scores)
                .map(([dimension, value]) => {
                    const score = (value as { score?: number }).score ?? 0;
                    const explanation = (value as { explanation?: string }).explanation ?? "";
                    return `  ${dimension}: ${score}/10${explanation ? ` — ${explanation}` : ""}`;
                })
                .join("\n");
            systemPrompt += `\n\n═══ ARCHITECTURE SCORES ═══\n${scoreSummary}\nUse these scores to identify weak areas and suggest improvements.`;
        }

        if ((context?.lintIssues?.length ?? 0) > 0) {
            const lintSummary = context.lintIssues
                .slice(0, 10)
                .map((issue: { severity?: string; title?: string; description?: string; suggestedFix?: string }) =>
                    `  [${issue.severity ?? "info"}] ${issue.title ?? "Issue"}${issue.suggestedFix ? ` → Fix: ${issue.suggestedFix}` : ""}`
                )
                .join("\n");
            systemPrompt += `\n\n═══ LINT FINDINGS ═══\n${lintSummary}\nProactively address critical/error-level issues when making changes.`;
        }

        if (context?.constraints && Object.keys(context.constraints).length > 0) {
            const constraintSummary = Object.entries(context.constraints)
                .filter(([, value]) => Boolean(value))
                .map(([key, value]) => `  ${key}: ${value}`)
                .join("\n");

            if (constraintSummary) {
                systemPrompt += `\n\n═══ PROJECT CONSTRAINTS ═══\n${constraintSummary}\nAll recommendations must respect these constraints.`;
            }
        }

        systemPrompt += `\n\n═══ CANVAS ACTION PROTOCOL ═══
To modify the architecture canvas, emit JSON inside <canvas_action> tags. Actions are applied in real-time as you stream.

Format (no markdown fences, one action per block):
<canvas_action>{"action":"add_component","componentType":"nextjs","nodeId":"web_app","label":"Next.js Web App","x":120,"y":80}</canvas_action>

Supported actions:
  1) add_component    → { action, componentType, nodeId?, label?, provider?, x?, y?, tags?, config? }
  2) remove_component → { action, nodeId }
  3) move_component   → { action, nodeId, x?, y? }
  4) update_component → { action, nodeId, newLabel?, provider?, tags?, config? }
  5) connect_components → { action, sourceId, targetId, relationshipType?, protocol?, edgeId? }
     relationshipType options: "invokes", "reads", "writes", "authenticates", "publishes", "subscribes", "caches", "proxies"
  6) remove_connection → { action, edgeId } or { action, sourceId, targetId }

CRITICAL RULES:
- componentType MUST be an exact key from the catalog below (e.g., "nextjs", "postgresql", "clerk", "stripe").
- Use existing nodeId values exactly when modifying/removing/connecting.
- Place components logically: frontend at top (y≈80-150), backend middle (y≈250-400), data layer bottom (y≈450-600), infra at bottom (y≈650+). Spread horizontally (x increments of ~250).
- After emitting actions, explain what you changed and why in plain text.

═══ COMPONENT CATALOG ═══
Format: key | name | provider | tier/maturity | scores | best-for | avoid-when

${CATALOG_BLOCK}`;

        const result = streamText({
            model: google("gemini-3-flash-preview"),
            system: systemPrompt,
            maxOutputTokens: FAST_OUTPUT_TOKENS.chatStream,
            providerOptions: LOW_REASONING_PROVIDER_OPTIONS,
            messages: messages.map((m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response("AI chat error. Please check your GOOGLE_GENERATIVE_AI_API_KEY.", {
            status: 500,
        });
    }
}
