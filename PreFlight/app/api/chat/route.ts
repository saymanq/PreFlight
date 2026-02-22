import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { COMPONENT_CATALOG } from "@/lib/component-catalog";

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        const cleanIdeaMessage = (content: string) =>
            content
                .replace(/```extracted\s*\r?\n[\s\S]*?```\s*/gi, "")
                .replace(/\[READY_TO_GENERATE\]\s*/g, "")
                .trim();

        // Build context-aware system prompt
        const availableComponents = COMPONENT_CATALOG
            .map((component) => `${component.type}: ${component.label} (${component.category}, ${component.provider})`)
            .join("\n");

        let systemPrompt = `You are an expert software architect assistant for the Preflight architecture planning platform. 
You help users design, understand, and improve their software architecture.

Be concise but thorough. Use technical terms appropriately. When suggesting changes, explain trade-offs.
Treat this as a continuation of the prior discovery conversation and current architecture state.`;

        if ((context?.priorIdeaMessages?.length ?? 0) > 0) {
            const priorConversation = context.priorIdeaMessages
                .slice(-12)
                .map((m: { role: "user" | "assistant"; content: string }) => {
                    const roleLabel = m.role === "user" ? "User" : "Assistant";
                    return `- ${roleLabel}: ${cleanIdeaMessage(m.content)}`;
                })
                .join("\n");

            systemPrompt += `\n\nPrior Idea Conversation (for continuity):
${priorConversation}`;
        }

        if (context?.nodes?.length > 0) {
            systemPrompt += `\n\nCurrent Architecture Context:
Components (${context.nodes.length}):
${context.nodes.map((n: { id: string; label: string; type: string; category: string; provider: string }) => `- ${n.id}: ${n.label} (${n.type}, ${n.category}, provider: ${n.provider})`).join("\n")}

Connections (${context.edges?.length ?? 0}):
${(context.edges ?? []).map((e: { id?: string; source: string; target: string; type: string }) => `- ${e.id ?? "edge"}: ${e.source} → ${e.target} (${e.type})`).join("\n")}`;
        } else {
            systemPrompt += `\n\nThe user's canvas is currently empty. Help them get started by suggesting architectures.`;
        }

        if (context?.scores && Object.keys(context.scores).length > 0) {
            const scoreSummary = Object.entries(context.scores)
                .map(([dimension, value]) => {
                    const score = (value as { score?: number }).score ?? 0;
                    return `- ${dimension}: ${score}/10`;
                })
                .join("\n");
            systemPrompt += `\n\nCurrent Scores:\n${scoreSummary}`;
        }

        if ((context?.lintIssues?.length ?? 0) > 0) {
            const lintSummary = context.lintIssues
                .slice(0, 10)
                .map((issue: { severity?: string; title?: string }) => `- [${issue.severity ?? "info"}] ${issue.title ?? "Issue"}`)
                .join("\n");
            systemPrompt += `\n\nCurrent Lint Findings:\n${lintSummary}`;
        }

        if (context?.constraints && Object.keys(context.constraints).length > 0) {
            const constraintSummary = Object.entries(context.constraints)
                .filter(([, value]) => Boolean(value))
                .map(([key, value]) => `- ${key}: ${value}`)
                .join("\n");

            if (constraintSummary) {
                systemPrompt += `\n\nCurrent Project Constraints:\n${constraintSummary}`;
            }
        }

        systemPrompt += `\n\nImportant:
- The visible assistant thread here may be short; still use prior conversation context above.
- Do not restate the full history unless user asks.
- Focus on actionable follow-up guidance for the current architecture.

Canvas Editing Protocol:
- If the user asks for architecture changes, emit one or more canvas action blocks before your explanation.
- Each block must be valid JSON inside XML tags on its own line, without markdown code fences:
<canvas_action>{"action":"add_component","componentType":"nextjs_app","nodeId":"web_app","label":"Web App","x":120,"y":80}</canvas_action>
- Allowed actions:
  1) add_component: { action, componentType, nodeId?, label?, provider?, x?, y?, tags?, config? }
  2) move_component: { action, nodeId, x?, y? }
  3) update_component: { action, nodeId, newLabel?, provider?, tags?, config? }
  4) remove_component: { action, nodeId }
  5) connect_components: { action, sourceId, targetId, relationshipType?, protocol?, edgeId? }
  6) remove_connection: { action, edgeId } or { action, sourceId, targetId }
- Use only these action names.
- Use existing node IDs exactly when modifying/moving/removing.
- Use only componentType values from the catalog below when adding nodes.
- After action blocks, give a concise explanation of what changed.

Available Component Types:
${availableComponents}`;

        const result = streamText({
            model: google("gemini-3-flash-preview"),
            system: systemPrompt,
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
