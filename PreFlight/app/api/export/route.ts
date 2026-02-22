import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
    try {
        const { projectName, nodes, edges, scores } = await req.json();

        const architectureSummary = nodes
            .map(
                (n: { label: string; type: string; category: string; provider: string }) =>
                    `- ${n.label} (${n.type}, ${n.category}, provider: ${n.provider})`
            )
            .join("\n");

        const connectionsSummary = edges
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

        const result = await generateText({
            model: google("gemini-3-flash-preview"),
            prompt: `You are an expert software architect. Generate a comprehensive implementation prompt pack for the following architecture.

PROJECT: ${projectName}

ARCHITECTURE COMPONENTS:
${architectureSummary}

CONNECTIONS:
${connectionsSummary}

SCORES:
${scoresSummary}

Generate a detailed prompt pack with the following sections. Each prompt should be ready to paste into an AI coding tool like Cursor, Claude, or Lovable.

FORMAT:
# ${projectName} — Implementation Prompt Pack

## Prompt 1: Project Scaffolding
[Prompt for setting up the project, installing dependencies, and basic configuration]

## Prompt 2: Authentication Setup
[Prompt for auth, if applicable]

## Prompt 3: Database Schema & Backend
[Prompt for data schema and backend functions]

## Prompt 4: Core Features
[Prompt for main feature implementation]

## Prompt 5: AI Integration
[Prompt for AI features, if applicable]

## Prompt 6: Frontend & UI
[Prompt for pages, components, and styling]

## Prompt 7: Testing & Deployment
[Prompt for testing and deployment setup]

For each prompt include:
- Goal
- Files to create/update
- Expected outputs
- Acceptance checks

Make the prompts specific to the architecture components used. Reference actual providers, services, and tech choices.`,
        });

        return Response.json({ promptPack: result.text });
    } catch (error) {
        console.error("Export API error:", error);
        return new Response("Export failed. Please check your GOOGLE_GENERATIVE_AI_API_KEY.", {
            status: 500,
        });
    }
}
