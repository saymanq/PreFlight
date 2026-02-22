/**
 * API client -- AI-only calls to the FastAPI backend.
 * All data CRUD goes through Convex (see convex/ directory).
 */

const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000/api";

/** Base URL without /api for health check */
export function getBackendBaseUrl(): string {
  return API_BASE_URL.replace(/\/api\/?$/, "") || "http://localhost:8000";
}

import { Scope } from "./types";

export interface ChatResponse {
  message: string;
  session_id: string;
  suggest_implementation: boolean;
  updated_architecture?: any;
  updated_scope?: Partial<Scope>;
  canvas_action?: "update" | "clear" | "none";
}

export interface ImplementResponse {
  updated_architecture: any;
  explanation: string;
}

/**
 * Send a message to the backend chat AI (Gemini).
 * Includes full canvas context so the model has real-time awareness.
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
  currentArchitecture?: any,
  chatWidth?: number,
  extra?: {
    conversation_history?: { role: string; content: string }[];
    constraints?: any;
    lint_issues?: any[];
    recent_actions?: string[];
    plan_context?: { role: string; content: string }[][];
  }
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      architecture_json: currentArchitecture,
      chat_width: chatWidth || 600,
      conversation_history: extra?.conversation_history,
      constraints: extra?.constraints,
      lint_issues: extra?.lint_issues,
      recent_actions: extra?.recent_actions,
      plan_context: extra?.plan_context,
    }),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Request architecture implementation via AI.
 */
export async function implementArchitecture(
  request: string,
  sessionId: string,
  currentArchitecture: any
): Promise<ImplementResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/implement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      implementation_request: request,
      session_id: sessionId,
      architecture_json: currentArchitecture,
    }),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ===== Planning Chat (AI only) =====

export interface PlanMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlanChatResponse {
  message: string;
  session_id: string;
  suggested_component_ids: string[];
}

/**
 * Send messages to the plan AI; backend calls Gemini and returns reply + suggested component IDs.
 */
export async function sendPlanMessage(
  messages: PlanMessage[],
  sessionId?: string
): Promise<PlanChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      ...(sessionId != null && sessionId !== "" ? { session_id: sessionId } : {}),
    }),
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body?.detail) {
        detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(`Plan chat error: ${response.status} – ${detail}`);
  }
  return response.json();
}
