import { generateObject } from "ai";
import { z } from "zod";
import { COMPONENT_LIBRARY } from "@/lib/components-data";
import {
  FAST_OUTPUT_TOKENS,
  getPrimaryTextModel,
  LOW_REASONING_PROVIDER_OPTIONS,
} from "@/lib/ai/azure-openai";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const ARTIFACT_MARKER_REGEX = /<pf_artifact>([\s\S]*?)<\/pf_artifact>/i;

const VALID_COMPONENT_IDS = new Set(
  COMPONENT_LIBRARY.flatMap((category) => category.components.map((component) => component.id))
);

const DEFAULT_COMPONENT_IDS = ["nextjs", "fastapi", "postgresql", "clerk", "vercel"];

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

const artifactSchema = z.object({
  stage: z.enum(["discover", "scope", "constraints", "ready"]),
  ideaSummary: z.string().max(500),
  targetUsers: nullableString,
  problem: nullableString,
  coreOutcome: nullableString,
  mustHaveFeatures: z.array(z.string().max(140)).max(10),
  niceToHaveFeatures: z.array(z.string().max(140)).max(8),
  constraints: z.object({
    budgetLevel: nullableString,
    teamSize: nullableNumber,
    teamSetup: nullableString,
    timeline: nullableString,
    trafficExpectation: nullableString,
    dataSensitivity: nullableString,
    regionCount: nullableNumber,
    uptimeTarget: nullableNumber,
    devExperienceGoal: nullableString,
  }),
  openQuestions: z.array(z.string().max(180)).max(5),
  confidence: z.number().min(0).max(1),
  readyForArchitecture: z.boolean(),
});

const ideationResponseSchema = z.object({
  assistantMessage: z.string(),
  artifact: artifactSchema,
  readyToGenerate: z.boolean(),
  suggestedComponentIds: z.array(z.string()),
});

type Artifact = z.infer<typeof artifactSchema>;
type ConstraintKey = keyof Artifact["constraints"];

const REQUIRED_CONSTRAINT_KEYS: ConstraintKey[] = [
  "budgetLevel",
  "teamSize",
  "timeline",
  "trafficExpectation",
  "devExperienceGoal",
];

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

function parseArtifactFromPayload(input: unknown): Artifact | null {
  const parsed = artifactSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  return true;
}

function getMissingConstraintKeys(artifact: Artifact): ConstraintKey[] {
  return REQUIRED_CONSTRAINT_KEYS.filter(
    (key) => !hasMeaningfulValue(artifact.constraints[key])
  );
}

function isArchitectureReady(artifact: Artifact): boolean {
  const hasIdea = artifact.ideaSummary.trim().length >= 24;
  const hasUsers = hasMeaningfulValue(artifact.targetUsers);
  const hasProblemOrOutcome =
    hasMeaningfulValue(artifact.problem) || hasMeaningfulValue(artifact.coreOutcome);
  const hasMustHaveFeatures = artifact.mustHaveFeatures.length >= 3;
  const hasRequiredConstraints = getMissingConstraintKeys(artifact).length === 0;
  return (
    hasIdea &&
    hasUsers &&
    hasProblemOrOutcome &&
    hasMustHaveFeatures &&
    hasRequiredConstraints
  );
}

function normalizeArtifactForReadiness(artifact: Artifact): Artifact {
  if (!isArchitectureReady(artifact)) return artifact;
  return {
    ...artifact,
    stage: "ready",
    readyForArchitecture: true,
    openQuestions: [],
    confidence: Math.max(artifact.confidence, 0.8),
  };
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

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

function compactTranscript(messages: ChatMessage[]): string {
  return messages
    .slice(-24)
    .map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";
      return `${role}: ${truncate(message.content, 1100)}`;
    })
    .join("\n");
}

function isLengthOrParseError(error: unknown): boolean {
  const err = error as {
    message?: string;
    finishReason?: string;
    cause?: { message?: string };
  };
  const message = `${err?.message ?? ""} ${err?.cause?.message ?? ""}`.toLowerCase();
  return (
    err?.finishReason === "length" ||
    message.includes("no object generated") ||
    message.includes("json parsing failed") ||
    message.includes("unterminated string") ||
    message.includes("could not parse the response")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body ?? {};
    const rawMessages: ChatMessage[] = (messages ?? []).map((message: { role: string; content: string }) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content ?? ""),
    }));

    let previousArtifact: Artifact | null = parseArtifactFromPayload(body?.artifact);
    if (!previousArtifact) {
      for (let i = rawMessages.length - 1; i >= 0; i -= 1) {
        if (rawMessages[i].role !== "assistant") continue;
        const parsed = parseArtifactFromMessage(rawMessages[i].content);
        if (parsed) {
          previousArtifact = parsed;
          break;
        }
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

    const transcript = compactTranscript(normalizedMessages);
    const unresolvedConstraintKeys = previousArtifact
      ? getMissingConstraintKeys(previousArtifact)
      : REQUIRED_CONSTRAINT_KEYS;

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
- Do not repeat a question that was already answered in prior turns or already captured in the artifact.

Phases:
1) discover: clarify problem, target users, and core value.
2) scope: define must-have features and realistic v1 scope.
3) constraints: collect practical constraints (team, timeline, users/traffic, budget, reliability).
4) ready: once confidence is high and key unknowns are resolved, prepare for architecture generation.

Artifact behavior:
- Update the artifact every turn with best-known information.
- Treat "Previous artifact" as source-of-truth memory for already collected facts.
- Keep openQuestions concise and actionable.
- confidence should increase gradually (0..1).
- readyForArchitecture should be true only when idea + scope + constraints are sufficiently clear.
- Keep artifact concise for UI and persistence:
  - mustHaveFeatures: max 8 concise items
  - niceToHaveFeatures: max 5 concise items
  - openQuestions: max 3 concise items
  - ideaSummary: max 4 short sentences

Generation behavior:
- suggestedComponentIds must be empty unless readyToGenerate is true.
- When readyToGenerate is true, provide 6-12 suggestedComponentIds from the catalog.
- Use only IDs from component catalog when suggesting components.

Component catalog:
${componentCatalogSummary}`;

    const prompt = `Previous artifact (if any):
${previousArtifact ? JSON.stringify(previousArtifact, null, 2) : "none"}

Unresolved required constraints:
${unresolvedConstraintKeys.length > 0 ? unresolvedConstraintKeys.join(", ") : "none"}

Conversation transcript:
${transcript}`;

    const callStructured = async (promptText: string, maxTokens: number) =>
      generateObject({
        model: getPrimaryTextModel(),
        schema: ideationResponseSchema,
        system: systemPrompt,
        prompt: promptText,
        maxOutputTokens: maxTokens,
        providerOptions: LOW_REASONING_PROVIDER_OPTIONS,
      });

    let result;
    try {
      result = await callStructured(prompt, FAST_OUTPUT_TOKENS.ideation);
    } catch (primaryError) {
      if (!isLengthOrParseError(primaryError)) {
        throw primaryError;
      }

      const retryPrompt = `${prompt}

OUTPUT LIMITS (IMPORTANT):
- assistantMessage <= 120 words.
- Keep artifact compact.
- mustHaveFeatures max 8.
- niceToHaveFeatures max 5.
- openQuestions max 3.
- Ask for at most one unresolved field.
- Do not repeat previously answered questions.`;

      result = await callStructured(retryPrompt, FAST_OUTPUT_TOKENS.ideationRetry);
    }

    const assistantMessage =
      stripComponentIdsLine(result.object.assistantMessage).trim() ||
      "Let us refine your app idea step by step. What is the main user problem you want to solve first?";

    const explicitIds = extractComponentIdsFromLine(result.object.assistantMessage);
    const artifact = normalizeArtifactForReadiness(result.object.artifact);
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
      "Ideation chat failed. Please check AZURE_OPENAI_API_KEY_GPT_5_MINI and AZURE_OPENAI_ENDPOINT_GPT_5_MINI.",
      { status: 500 }
    );
  }
}
