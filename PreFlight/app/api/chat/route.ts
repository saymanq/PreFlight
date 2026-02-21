import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        const cleanIdeaMessage = (content: string) =>
            content
                .replace(/```extracted\s*\r?\n[\s\S]*?```\s*/gi, "")
                .replace(/\[READY_TO_GENERATE\]\s*/g, "")
                .trim();

        // Build context-aware system prompt
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
${context.nodes.map((n: { label: string; type: string; category: string; provider: string }) => `- ${n.label} (${n.type}, ${n.category}, provider: ${n.provider})`).join("\n")}

Connections (${context.edges?.length ?? 0}):
${(context.edges ?? []).map((e: { source: string; target: string; type: string }) => `- ${e.source} → ${e.target} (${e.type})`).join("\n")}`;
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
- Focus on actionable follow-up guidance for the current architecture.`;

        const result = streamText({
            model: google("gemini-3.1-pro-preview"),
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
