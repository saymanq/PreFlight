import { generateText } from "ai";
import {
    FAST_OUTPUT_TOKENS,
    getPrimaryTextModel,
    LOW_REASONING_PROVIDER_OPTIONS,
} from "@/lib/ai/azure-openai";

export async function POST(req: Request) {
    try {
        const {
            projectName,
            nodes,
            edges,
            scores,
            constraints,
            features,
            sourceIdeationSnapshot,
            workspaceChatMessages,
        } = await req.json();

        const safeNodes = Array.isArray(nodes) ? nodes : [];
        const safeEdges = Array.isArray(edges) ? edges : [];

        const architectureSummary = safeNodes
            .map(
                (n: { label: string; type: string; category: string; provider: string }) =>
                    `- ${n.label} (${n.type}, ${n.category}, provider: ${n.provider})`
            )
            .join("\n");

        const connectionsSummary = safeEdges
            .map(
                (e: { source: string; target: string; relationship: string }) =>
                    `- ${e.source} → ${e.target} (${e.relationship})`
            )
            .join("\n");

        const scoresSummary = scores
            ? Object.entries(scores)
                .map(
                    ([key, val]: [string, unknown]) => {
                        const v = val as { score: number; explanation: string };
                        return `- ${key}: ${v.score}/10 — ${v.explanation}`;
                    }
                )
                .join("\n")
            : "No scores available";

        const ideationSummary = Array.isArray(sourceIdeationSnapshot) && sourceIdeationSnapshot.length > 0
            ? sourceIdeationSnapshot
                .slice(-14)
                .map(
                    (m: { role: string; content: string }) =>
                        `- [${m.role}] ${m.content}`
                )
                .join("\n")
            : "No ideation thread snapshot available.";

        const workspaceConversationSummary = Array.isArray(workspaceChatMessages) && workspaceChatMessages.length > 0
            ? workspaceChatMessages
                .slice(-12)
                .map(
                    (m: { role: string; content: string }) =>
                        `- [${m.role}] ${m.content}`
                )
                .join("\n")
            : "No workspace conversation available.";

        const featuresSummary = Array.isArray(features) && features.length > 0
            ? features.map((f: string) => `- ${f}`).join("\n")
            : "No explicit feature list provided.";

        const constraintsSummary = constraints
            ? Object.entries(constraints)
                .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
                .join("\n")
            : "No explicit constraints provided.";

        const result = await generateText({
            model: getPrimaryTextModel(),
            maxOutputTokens: FAST_OUTPUT_TOKENS.exportPack,
            providerOptions: LOW_REASONING_PROVIDER_OPTIONS,
            prompt: `You are an expert software architect. Generate a comprehensive implementation prompt pack for the following architecture.

PROJECT: ${projectName}

ARCHITECTURE COMPONENTS:
${architectureSummary}

CONNECTIONS:
${connectionsSummary}

SCORES:
${scoresSummary}

FEATURES:
${featuresSummary}

CONSTRAINTS:
${constraintsSummary}

USER IDEA + PLAN DISCUSSION (ideation thread):
${ideationSummary}

WORKSPACE CHAT CONTEXT:
${workspaceConversationSummary}

Important:
- Tailor the report to the exact stack/components above
- If information is missing, state assumptions explicitly
- Keep it implementation-oriented and understandable for non-experts.`,
        });

        return Response.json({ reportMarkdown: result.text, promptPack: result.text });
    } catch (error) {
        console.error("Export API error:", error);
        return new Response("Export failed. Please check AZURE_OPENAI_API_KEY_GPT_5_MINI and AZURE_OPENAI_ENDPOINT_GPT_5_MINI.", {
            status: 500,
        });
    }
}
