import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        // Build context-aware system prompt
        let systemPrompt = `You are an expert software architect assistant for the Preflight architecture planning platform. 
You help users design, understand, and improve their software architecture.

Be concise but thorough. Use technical terms appropriately. When suggesting changes, explain trade-offs.`;

        if (context?.nodes?.length > 0) {
            systemPrompt += `\n\nCurrent Architecture Context:
Components (${context.nodes.length}):
${context.nodes.map((n: { label: string; type: string; category: string; provider: string }) => `- ${n.label} (${n.type}, ${n.category}, provider: ${n.provider})`).join("\n")}

Connections (${context.edges?.length ?? 0}):
${(context.edges ?? []).map((e: { source: string; target: string; type: string }) => `- ${e.source} → ${e.target} (${e.type})`).join("\n")}`;
        } else {
            systemPrompt += `\n\nThe user's canvas is currently empty. Help them get started by suggesting architectures.`;
        }

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
