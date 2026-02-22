import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { COMPONENT_LIBRARY } from "@/lib/components-data";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const VALID_COMPONENT_IDS = new Set(
  COMPONENT_LIBRARY.flatMap((category) => category.components.map((component) => component.id))
);

const DEFAULT_COMPONENT_IDS = ["nextjs", "fastapi", "postgresql", "clerk", "vercel"];

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

function extractComponentIdsFromTextMentions(content: string): string[] {
  const text = content.toLowerCase();
  const ids: string[] = [];
  for (const id of VALID_COMPONENT_IDS) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, "i");
    if (pattern.test(text)) ids.push(id);
  }
  return ids;
}

function extractComponentIds(content: string): string[] {
  const fromLine = extractComponentIdsFromLine(content);
  if (fromLine.length > 0) return fromLine;

  const fromMentions = extractComponentIdsFromTextMentions(content);
  return uniqueValidComponentIds(fromMentions);
}

function inferFallbackComponentIds(messages: ChatMessage[]): string[] {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase())
    .join(" ");

  const selected = [...DEFAULT_COMPONENT_IDS];

  if (/\b(ai|llm|agent|chatbot|openai|anthropic|rag)\b/i.test(userText)) {
    selected.push("openai", "redis-cache");
  }
  if (/\b(realtime|real-time|live|socket|chat)\b/i.test(userText)) {
    selected.push("redis-pubsub");
  }
  if (/\b(files?|upload|media|storage)\b/i.test(userText)) {
    selected.push("s3");
  }
  if (/\b(search)\b/i.test(userText)) {
    selected.push("elasticsearch");
  }

  return uniqueValidComponentIds(selected);
}

function stripComponentIdsLine(content: string): string {
  return content.replace(/\n?\s*COMPONENT_IDS:\s*[^\n]+/gi, "").trim();
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const normalizedMessages: ChatMessage[] = (messages ?? []).map(
      (message: { role: string; content: string }) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content ?? ""),
      })
    );

    const componentCatalogSummary = COMPONENT_LIBRARY.map((category) => {
      const ids = category.components.map((component) => component.id).join(", ");
      return `- ${category.name}: ${ids}`;
    }).join("\n");

    const result = await generateText({
      model: google("gemini-3-flash-preview"),
      system: `You are Preflight, a principal software architect helping users shape ideas before building.

Your job:
1) Ask focused clarifying questions when requirements are incomplete.
2) Give concrete recommendations and trade-offs.
3) When ready, recommend an architecture component set by ending with one line:
COMPONENT_IDS: id1, id2, id3

Rules:
- Keep responses concise and practical.
- Ask at most one follow-up question per response.
- Use only component IDs from this catalog.
- Do not use markdown tables.
- If user asks to generate now, include COMPONENT_IDS in this response.

Component catalog:
${componentCatalogSummary}`,
      messages: normalizedMessages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
      temperature: 0.4,
      maxOutputTokens: 2200,
    });

    const explicitIds = extractComponentIds(result.text);
    const userTurns = normalizedMessages.filter((message) => message.role === "user").length;
    const latestUserText =
      normalizedMessages
        .filter((message) => message.role === "user")
        .slice(-1)[0]?.content.toLowerCase() ?? "";
    const userAskedToGenerate = /\b(generate|create project|build architecture|architecture now|go ahead)\b/i.test(
      latestUserText
    );
    const modelSignaledReady = /\[READY_TO_GENERATE\]|ready to generate|architecture recommendation/i.test(
      result.text
    );

    const suggestedComponentIds =
      explicitIds.length > 0
        ? explicitIds
        : userAskedToGenerate || modelSignaledReady || userTurns >= 2
          ? inferFallbackComponentIds(normalizedMessages)
          : [];

    const assistantMessage =
      stripComponentIdsLine(result.text) ||
      "I have enough context to propose an initial architecture. Review the suggested components below and generate when ready.";
    const readyToGenerate = suggestedComponentIds.length > 0;

    return Response.json({
      assistantMessage,
      suggestedComponentIds,
      readyToGenerate,
      // Compatibility with friend UI response shape.
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
