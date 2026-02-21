import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { COMPONENT_CATALOG } from "@/lib/component-catalog";

const architectureSchema = z.object({
    nodes: z.array(
        z.object({
            id: z.string(),
            data: z.object({
                type: z.string(),
                category: z.string(),
                label: z.string(),
                provider: z.string(),
                icon: z.string(),
                config: z.record(z.string(), z.unknown()).default({}),
                tags: z.array(z.string()).default([]),
            }),
            position: z.object({
                x: z.number(),
                y: z.number(),
            }),
        })
    ),
    edges: z.array(
        z.object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
            data: z.object({
                relationshipType: z.string(),
                protocol: z.string().default("RPC"),
            }),
        })
    ),
    rationale: z.string(),
    assumptions: z.array(z.string()),
});

export async function POST(req: Request) {
    try {
        const { prompt, constraints } = await req.json();

        const availableTypes = COMPONENT_CATALOG.map(
            (c) =>
                `{ type: "${c.type}", category: "${c.category}", label: "${c.label}", provider: "${c.provider}", icon: "${c.icon}", tags: [${c.tags.map((t) => `"${t}"`).join(", ")}] }`
        ).join("\n");

        const result = await generateObject({
            model: google("gemini-3-flash-preview"),
            schema: architectureSchema,
            prompt: `You are an expert software architect. Generate an architecture for the following app idea.

APP IDEA: ${prompt}

CONSTRAINTS:
${Object.entries(constraints || {})
                    .filter(([_, v]) => v)
                    .map(([k, v]) => `- ${k}: ${v}`)
                    .join("\n")}

AVAILABLE COMPONENT TYPES (use these exact types):
${availableTypes}

RULES:
1. Use ONLY the component types listed above
2. Generate between 4-10 nodes depending on app complexity
3. Create edges that represent real data flow / dependencies
4. Position nodes in a logical layout:
   - Frontend nodes at top (y: 50-150)
   - Auth nodes at y: 200-300
   - Backend nodes at y: 300-450
   - Data/Storage nodes at bottom (y: 500-650)
   - AI nodes on the right side (x: 500+)
5. Space nodes horizontally by ~280px
6. Use meaningful IDs like "nextjs_1", "convex_1", etc.
7. Edge relationship types: reads, writes, authenticates, uploads_to, invokes, queues, subscribes
8. Edge protocols: HTTP, WebSocket, RPC, gRPC

Generate a practical, well-connected architecture.`,
        });

        return Response.json(result.object);
    } catch (error) {
        console.error("Generate API error:", error);
        return new Response(
            "Architecture generation failed. Please check your GOOGLE_GENERATIVE_AI_API_KEY.",
            { status: 500 }
        );
    }
}
