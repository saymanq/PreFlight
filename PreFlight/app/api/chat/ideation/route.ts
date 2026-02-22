import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { COMPONENT_LIBRARY } from "@/lib/components-data";
import {
  FAST_OUTPUT_TOKENS,
  LOW_REASONING_PROVIDER_OPTIONS,
} from "@/lib/ai/google-generation";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const ARTIFACT_MARKER_REGEX = /<pf_artifact>([\s\S]*?)<\/pf_artifact>/i;

const VALID_COMPONENT_IDS = new Set(
  COMPONENT_LIBRARY.flatMap((category) => category.components.map((component) => component.id))
);

const DEFAULT_COMPONENT_IDS = ["nextjs", "fastapi", "postgresql", "clerk", "vercel"];

const artifactSchema = z.object({
  stage: z.enum(["discover", "scope", "constraints", "ready"]),
  ideaSummary: z.string(),
  targetUsers: z.string().optional(),
  problem: z.string().optional(),
  coreOutcome: z.string().optional(),
  mustHaveFeatures: z.array(z.string()).default([]),
  niceToHaveFeatures: z.array(z.string()).default([]),
  constraints: z
    .object({
      budgetLevel: z.string().optional(),
      teamSize: z.number().optional(),
      teamSetup: z.string().optional(),
      timeline: z.string().optional(),
      trafficExpectation: z.string().optional(),
      dataSensitivity: z.string().optional(),
      regionCount: z.number().optional(),
      uptimeTarget: z.number().optional(),
      devExperienceGoal: z.string().optional(),
    })
    .default({}),
  openQuestions: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.4),
  readyForArchitecture: z.boolean().default(false),
});

const ideationResponseSchema = z.object({
  assistantMessage: z.string(),
  artifact: artifactSchema,
  readyToGenerate: z.boolean(),
  suggestedComponentIds: z.array(z.string()).optional(),
});

function uniqueValidComponentIds(values: string[]): string[] {
  return values
    .map((value) => value.trim().toLowerCase())
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .filter((value) => VALID_COMPONENT_IDS.has(value));
}

function extractComponentIdsFromLine(content: string): string[] {
  const lineMatch = content.match(/COMPONENT_IDS:\s*([^\n]+)/i);
  if (!lineMatch) return [];
  return uniqueValidComponentIds(lineMatch[1].split(","));
}

function stripComponentIdsLine(content: string): string {
  return content.replace(/\n?\s*COMPONENT_IDS:\s*[^\n]+/gi, "").trim();
}

function stripArtifactMarker(content: string): string {
  return content.replace(/<pf_artifact>[\s\S]*?<\/pf_artifact>/gi, "").trim();
}

function parseArtifactFromMessage(content: string): z.infer<typeof artifactSchema> | null {
  const match = content.match(ARTIFACT_MARKER_REGEX);
  if (!match?.[1]) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded);
    return artifactSchema.parse(parsed);
  } catch {
    return null;
  }
}

function inferFallbackComponentIds(
  messages: ChatMessage[],
  artifact: z.infer<typeof artifactSchema>
): string[] {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase())
    .join(" ");
  const artifactText = [
    artifact.ideaSummary,
    artifact.problem ?? "",
    artifact.coreOutcome ?? "",
    ...(artifact.mustHaveFeatures ?? []),
    ...(artifact.niceToHaveFeatures ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const selected = [...DEFAULT_COMPONENT_IDS];

  if (/\b(ai|llm|agent|chatbot|openai|anthropic|rag)\b/i.test(`${userText} ${artifactText}`)) {
    selected.push("openai", "redis-cache");
  }
  if (/\b(realtime|real-time|live|socket|chat|stream)\b/i.test(`${userText} ${artifactText}`)) {
    selected.push("redis-pubsub");
  }
  if (/\b(video|media|upload|storage|files?)\b/i.test(`${userText} ${artifactText}`)) {
    selected.push("s3");
  }
  if (/\bsearch|discovery|index\b/i.test(`${userText} ${artifactText}`)) {
    selected.push("elasticsearch");
  }
  if (/\banalytics|dashboard|metrics\b/i.test(`${userText} ${artifactText}`)) {
    selected.push("sentry");
  }

  return uniqueValidComponentIds(selected);
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const rawMessages: ChatMessage[] = (messages ?? []).map((message: { role: string; content: string }) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content ?? ""),
    }));

    let previousArtifact: z.infer<typeof artifactSchema> | null = null;
    for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
      if (rawMessages[i].role !== "assistant") continue;
      const parsed = parseArtifactFromMessage(rawMessages[i].content);
      if (parsed) {
        previousArtifact = parsed;
        break;
      }
    }

    const normalizedMessages: ChatMessage[] = rawMessages.map((message) => ({
      ...message,
      content: stripComponentIdsLine(stripArtifactMarker(message.content)),
    }));

    const componentCatalogSummary = COMPONENT_LIBRARY.map((category) => {
      const ids = category.components.map((component) => component.id).join(", ");
      return `- ${category.name}: ${ids}`;
    }).join("\n");

    const transcript = normalizedMessages
      .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
      .join("\n");

    const systemPrompt = `You are Preflight Ideation Agent.

Primary objective:
Guide beginner users from vague idea -> clear product definition -> architecture readiness.

Conversation style:
- Lead the conversation gently and progressively.
- Ask exactly one focused question at a time.
- Do not ask a checklist of many questions in one reply.
- Always provide small useful guidance before your one question.
- Explain trade-offs in beginner-friendly language.
- Avoid jargon dumps.

Phases:
1) discover: clarify problem, target users, and core value.
2) scope: define must-have features and realistic v1 scope.
3) constraints: collect practical constraints (team, timeline, users/traffic, budget, reliability).
4) ready: once confidence is high and key unknowns are resolved, prepare for architecture generation.

Artifact behavior:
- Update the artifact every turn with best-known information.
- Keep openQuestions concise and actionable.
- confidence should increase gradually (0..1).
- readyForArchitecture should be true only when idea + scope + constraints are sufficiently clear.

Generation behavior:
- suggestedComponentIds must be empty unless readyToGenerate is true.
- Use only IDs from component catalog when suggesting components.

Component catalog:
${componentCatalogSummary}`;

    const prompt = `Previous artifact (if any):
${previousArtifact ? JSON.stringify(previousArtifact, null, 2) : "none"}

Conversation transcript:
${transcript}`;

    const result = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: ideationResponseSchema,
      system: systemPrompt,
      prompt,
      temperature: 0.35,
      maxOutputTokens: FAST_OUTPUT_TOKENS.ideation,
      providerOptions: LOW_REASONING_PROVIDER_OPTIONS,
    });

    const assistantMessage =
      stripComponentIdsLine(result.object.assistantMessage).trim() ||
      "Let us refine your app idea step by step. What is the main user problem you want to solve first?";

    const explicitIds = extractComponentIdsFromLine(result.object.assistantMessage);
    const artifact = result.object.artifact;
    const readyToGenerate =
      Boolean(result.object.readyToGenerate) || Boolean(artifact.readyForArchitecture);

    const suggestedFromModel = uniqueValidComponentIds(result.object.suggestedComponentIds ?? []);
    const suggestedComponentIds = readyToGenerate
      ? explicitIds.length > 0
        ? explicitIds
        : suggestedFromModel.length > 0
          ? suggestedFromModel
          : inferFallbackComponentIds(normalizedMessages, artifact)
      : [];

    return Response.json({
      assistantMessage,
      suggestedComponentIds,
      readyToGenerate,
      artifact,
      // Compatibility with friend-style UI shape.
      message: assistantMessage,
      suggested_component_ids: suggestedComponentIds,
    });
  } catch (error) {
    console.error("Ideation chat API error:", error);
    return new Response(
      "Ideation chat failed. Please check your GOOGLE_GENERATIVE_AI_API_KEY.",
      { status: 500 }
    );
  }
}
