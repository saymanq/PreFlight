/**
 * API client for local Next.js route handlers.
 * AI calls are served by app/api routes in this same app.
 */

import { Scope } from "./types";

export function getBackendBaseUrl(): string {
  return "";
}

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

export async function sendChatMessage(
  message: string,
  sessionId?: string,
  currentArchitecture?: any,
  _chatWidth?: number,
  extra?: {
    conversation_history?: { role: string; content: string }[];
    constraints?: any;
    lint_issues?: any[];
    recent_actions?: string[];
    plan_context?: { role: string; content: string }[][];
    source_ideation_snapshot?: { role: "user" | "assistant"; content: string; createdAt: number }[];
    scores?: any;
    architecture_stats?: {
      nodeCount: number;
      edgeCount: number;
      lintIssueCount: number;
      overallScore?: number | null;
    };
    cost_estimate?: any;
  }
): Promise<ChatResponse> {
  const response = await fetch(`/api/chat/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      architecture_json: currentArchitecture,
      conversation_history: extra?.conversation_history,
      constraints: extra?.constraints,
      lint_issues: extra?.lint_issues,
      recent_actions: extra?.recent_actions,
      plan_context: extra?.plan_context,
      source_ideation_snapshot: extra?.source_ideation_snapshot,
      scores: extra?.scores,
      architecture_stats: extra?.architecture_stats,
      cost_estimate: extra?.cost_estimate,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface PlanMessage {
  role: "user" | "assistant";
  content: string;
}

export interface IdeationArtifact {
  stage: "discover" | "scope" | "constraints" | "ready";
  ideaSummary: string;
  targetUsers?: string;
  problem?: string;
  coreOutcome?: string;
  mustHaveFeatures: string[];
  niceToHaveFeatures: string[];
  constraints: {
    budgetLevel?: string;
    teamSize?: number;
    teamSetup?: string;
    timeline?: string;
    trafficExpectation?: string;
    dataSensitivity?: string;
    regionCount?: number;
    uptimeTarget?: number;
    devExperienceGoal?: string;
  };
  openQuestions: string[];
  confidence: number;
  readyForArchitecture: boolean;
}

export interface PlanChatResponse {
  message: string;
  session_id: string;
  suggested_component_ids: string[];
  assistantMessage?: string;
  suggestedComponentIds?: string[];
  readyToGenerate?: boolean;
  artifact?: IdeationArtifact;
}

export async function sendPlanMessage(
  messages: PlanMessage[],
  artifact?: IdeationArtifact | null,
  _sessionId?: string
): Promise<PlanChatResponse> {
  const response = await fetch(`/api/chat/ideation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      artifact: artifact ?? null,
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
    throw new Error(`Plan chat error: ${response.status} - ${detail}`);
  }

  return response.json();
}
