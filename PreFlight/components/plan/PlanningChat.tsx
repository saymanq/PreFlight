"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { sendPlanMessage, type IdeationArtifact } from "@/lib/api";
import { COMPONENT_LIBRARY, getComponentById } from "@/lib/components-data";
import {
  ArrowRight,
  FolderOpen,
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
/* Particles removed — replaced with CSS gradient mesh background */

/* ─── Regex & Types (unchanged) ─── */

const ARTIFACT_MARKER_REGEX = /<pf_artifact>([\s\S]*?)<\/pf_artifact>/i;
const COMPONENTS_MARKER_REGEX = /<pf_components>([\s\S]*?)<\/pf_components>/i;
const GENERATION_MARKER_REGEX = /<pf_generation>([\s\S]*?)<\/pf_generation>/i;

interface GenerationMarker {
  projectId: string;
  componentIds: string[];
  createdAt: number;
}

const QUICK_ACTIONS = [
  { icon: "\u26A1", label: "SaaS App", prompt: "I want to build a SaaS application" },
  { icon: "\uD83E\uDD16", label: "AI Agent", prompt: "I want to build an AI agent or assistant" },
  { icon: "\uD83D\uDED2", label: "Marketplace", prompt: "I want to build a marketplace" },
  { icon: "\uD83D\uDCAC", label: "Realtime Chat", prompt: "I want to build a real-time chat app" },
  { icon: "\uD83D\uDCCA", label: "Dashboard", prompt: "I want to build an analytics dashboard" },
];

/* ─── Utility functions (all unchanged) ─── */

function stripComponentIdsLine(text: string): string {
  return text.replace(/\n?\s*COMPONENT_IDS:\s*[^\n]+/i, "").trim();
}

function stripHiddenContent(text: string): string {
  return stripComponentIdsLine(
    text
      .replace(/<pf_artifact>[\s\S]*?<\/pf_artifact>/gi, "")
      .replace(/<pf_components>[\s\S]*?<\/pf_components>/gi, "")
      .replace(/<pf_generation>[\s\S]*?<\/pf_generation>/gi, "")
      .trim()
  );
}

function parseArtifactFromText(text: string): IdeationArtifact | null {
  const match = text.match(ARTIFACT_MARKER_REGEX);
  if (!match?.[1]) return null;

  try {
    const decoded = decodeURIComponent(match[1]);
    return JSON.parse(decoded) as IdeationArtifact;
  } catch {
    return null;
  }
}

function attachArtifactToText(text: string, artifact: IdeationArtifact | null): string {
  if (!artifact) return text;
  const payload = encodeURIComponent(JSON.stringify(artifact));
  return `${text}\n<pf_artifact>${payload}</pf_artifact>`;
}

function normalizeComponentIds(componentIds: string[]): string[] {
  return componentIds
    .map((id) => id.trim())
    .filter((id, index, all) => id.length > 0 && all.indexOf(id) === index)
    .filter((id) => Boolean(getComponentById(id)));
}

function parseComponentIdsFromText(text: string): string[] {
  const match = text.match(COMPONENTS_MARKER_REGEX);
  if (!match?.[1]) return [];
  try {
    const decoded = decodeURIComponent(match[1]);
    if (decoded.startsWith("[") || decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        return normalizeComponentIds(parsed.map((value) => String(value)));
      }
    }
    return normalizeComponentIds(decoded.split(","));
  } catch {
    return normalizeComponentIds(match[1].split(","));
  }
}

function attachComponentIdsToText(text: string, componentIds: string[]): string {
  const normalized = normalizeComponentIds(componentIds);
  if (normalized.length === 0) return text;
  const payload = encodeURIComponent(normalized.join(","));
  return `${text}\n<pf_components>${payload}</pf_components>`;
}

function parseGenerationFromText(text: string): GenerationMarker | null {
  const match = text.match(GENERATION_MARKER_REGEX);
  if (!match?.[1]) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded) as Partial<GenerationMarker>;
    if (!parsed.projectId) return null;
    return {
      projectId: String(parsed.projectId),
      componentIds: normalizeComponentIds((parsed.componentIds ?? []).map((id) => String(id))),
      createdAt: Number(parsed.createdAt) || Date.now(),
    };
  } catch {
    return null;
  }
}

function attachGenerationToText(text: string, generation: GenerationMarker): string {
  const payload = encodeURIComponent(JSON.stringify(generation));
  return `${text}\n<pf_generation>${payload}</pf_generation>`;
}

function findLatestSuggestedComponents(
  messages: { role: "user" | "assistant"; content: string }[]
): { ids: string[]; index: number } | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const ids = parseComponentIdsFromText(msg.content);
    if (ids.length > 0) return { ids, index: i };
  }
  return null;
}

function findLatestGeneration(
  messages: { role: "user" | "assistant"; content: string }[]
): { data: GenerationMarker; index: number } | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const generation = parseGenerationFromText(msg.content);
    if (generation) return { data: generation, index: i };
  }
  return null;
}

function getCategoryForComponent(componentId: string): string {
  for (const cat of COMPONENT_LIBRARY) {
    if (cat.components.some((c) => c.id === componentId)) return cat.name;
  }
  return "Component";
}

function stageLabel(stage: IdeationArtifact["stage"] | undefined): string {
  if (stage === "discover") return "Discovery";
  if (stage === "scope") return "Scope";
  if (stage === "constraints") return "Constraints";
  if (stage === "ready") return "Ready";
  return "Ideation";
}

function normalizeBudgetLevel(value: string | undefined): "low" | "medium" | "high" {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "low") return "low";
  if (normalized === "high") return "high";
  return "medium";
}

function normalizeTimeline(value: string | undefined): "hackathon" | "1month" | "3months" | "production" {
  const normalized = value?.toLowerCase().replace(/\s+/g, "");
  if (!normalized) return "1month";
  if (normalized.includes("hackathon")) return "hackathon";
  if (normalized.includes("production")) return "production";
  if (normalized.includes("3month") || normalized.includes("quarter")) return "3months";
  return "1month";
}

function normalizeTraffic(value: string | undefined): "low" | "medium" | "high" | "very_high" {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "low") return "low";
  if (normalized === "high") return "high";
  if (normalized === "very_high" || normalized === "very high") return "very_high";
  return "medium";
}

function normalizeSensitivity(value: string | undefined): "low" | "medium" | "high" {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "low") return "low";
  if (normalized === "high") return "high";
  return "medium";
}

function normalizeDevGoal(value: string | undefined): "mvp_speed" | "balanced" | "scale_ready" {
  const normalized = value?.toLowerCase().replace(/\s+/g, "_").trim();
  if (normalized === "mvp_speed" || normalized === "fastest_mvp") return "mvp_speed";
  if (normalized === "scale_ready") return "scale_ready";
  return "balanced";
}

function mapArtifactToProjectConstraints(artifact: IdeationArtifact | null) {
  return {
    budgetLevel: normalizeBudgetLevel(artifact?.constraints?.budgetLevel),
    teamSize: Math.max(1, Math.min(200, Number(artifact?.constraints?.teamSize) || 2)),
    timeline: normalizeTimeline(artifact?.constraints?.timeline),
    trafficExpectation: normalizeTraffic(artifact?.constraints?.trafficExpectation),
    dataVolume: "medium" as const,
    uptimeTarget: Math.max(90, Math.min(99.99, Number(artifact?.constraints?.uptimeTarget) || 99)),
    regionCount: Math.max(1, Math.min(12, Number(artifact?.constraints?.regionCount) || 1)),
    devExperienceGoal: normalizeDevGoal(artifact?.constraints?.devExperienceGoal),
    dataSensitivity: normalizeSensitivity(artifact?.constraints?.dataSensitivity),
    preferredProviders: [] as string[],
    avoidProviders: [] as string[],
  };
}

/* ─── Visual components (redesigned) ─── */

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function ComponentCard({
  comp,
  categoryName,
  selected,
  onToggle,
}: {
  comp: { id: string; name: string; icon: string; color: string; description?: string; baseCost?: number };
  categoryName: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const benefits = comp.description
    ? [comp.description]
    : ["Production-ready", "Well-documented", "Strong ecosystem"];
  const costLabel = comp.baseCost && comp.baseCost > 0 ? `~$${comp.baseCost}/mo` : "Free tier";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative w-full text-left rounded-xl p-4 transition-all duration-200 border ${
        selected
          ? "bg-emerald-500/[0.06] border-emerald-500/20 shadow-[0_0_24px_rgba(16,185,129,0.06)]"
          : "bg-white/[0.015] border-slate-400/[0.06] hover:bg-white/[0.035] hover:border-slate-400/[0.12]"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: `${comp.color}12` }}
        >
          {comp.icon.startsWith("http") ? (
            <img src={comp.icon} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <span className="text-lg">{comp.icon}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[var(--plan-text)] truncate">{comp.name}</div>
          <div className="text-[11px] text-[var(--plan-text-muted)]">{categoryName}</div>
        </div>
      </div>

      <ul className="space-y-1.5 mb-3">
        {benefits.slice(0, 3).map((benefit, i) => (
          <li key={i} className="text-xs text-[var(--plan-text-secondary)] flex gap-2 items-start">
            <span className="w-1 h-1 rounded-full bg-emerald-500/50 mt-1.5 shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center text-[11px] text-[var(--plan-text-muted)]">
        <span>{costLabel}</span>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  suggestedIds,
  selectedIds,
  onToggleComponent,
}: {
  message: { role: string; content: string };
  suggestedIds: string[];
  selectedIds: string[];
  onToggleComponent: (id: string) => void;
}) {
  const isUser = message.role === "user";
  const displayContent = isUser ? message.content : stripHiddenContent(message.content);

  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\n)/g);
    return parts.map((part, i) => {
      if (part === "\n") return <br key={i} />;
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-[var(--plan-text)] font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-2 max-w-full`}>
      {!isUser && (
        <div className="flex items-center gap-2.5 pl-0.5">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <img src="/preflight-logo.png" alt="" className="w-4 h-4 object-contain" />
          </div>
          <span className="text-xs font-medium text-[var(--plan-text-muted)]">Preflight</span>
        </div>
      )}
      <div
        className={
          isUser
            ? "rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed text-[var(--plan-text)]/85 bg-emerald-500/[0.05] border border-emerald-500/[0.08] max-w-[520px]"
            : "text-sm leading-relaxed text-[var(--plan-text-secondary)] px-0.5 max-w-full"
        }
      >
        {renderMarkdown(displayContent)}
      </div>
      {!isUser && suggestedIds.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-2">
          {suggestedIds.map((id) => {
            const comp = getComponentById(id);
            if (!comp) return null;
            return (
              <ComponentCard
                key={id}
                comp={comp}
                categoryName={getCategoryForComponent(id)}
                selected={selectedIds.includes(id)}
                onToggle={() => onToggleComponent(id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArtifactPanel({ artifact }: { artifact: IdeationArtifact }) {
  const confidencePercent = Math.round(Math.max(0, Math.min(1, artifact.confidence ?? 0)) * 100);

  const keyConstraints = [
    artifact.constraints.teamSize ? `Team: ${artifact.constraints.teamSize}` : null,
    artifact.constraints.timeline ? `Timeline: ${artifact.constraints.timeline}` : null,
    artifact.constraints.trafficExpectation ? `Traffic: ${artifact.constraints.trafficExpectation}` : null,
    artifact.constraints.budgetLevel ? `Budget: ${artifact.constraints.budgetLevel}` : null,
    artifact.constraints.uptimeTarget ? `Uptime: ${artifact.constraints.uptimeTarget}%` : null,
    artifact.constraints.regionCount ? `Regions: ${artifact.constraints.regionCount}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-xl border border-[var(--plan-border)] bg-gradient-to-b from-white/[0.025] to-transparent p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-widest text-[var(--plan-text-muted)] uppercase">
            Ideation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[var(--plan-text-secondary)]">
            {stageLabel(artifact.stage)}
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/[0.12] text-emerald-400">
            {confidencePercent}% confident
          </span>
        </div>
      </div>

      <p className="text-sm text-[var(--plan-text)] leading-relaxed">{artifact.ideaSummary}</p>

      {artifact.mustHaveFeatures.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-widest text-[var(--plan-text-muted)] uppercase mb-2">
            Features
          </p>
          <div className="space-y-1.5">
            {artifact.mustHaveFeatures.slice(0, 5).map((feature) => (
              <div key={feature} className="flex gap-2 items-start text-xs text-[var(--plan-text-secondary)]">
                <span className="w-1 h-1 rounded-full bg-emerald-500/50 mt-1.5 shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      )}

      {keyConstraints.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {keyConstraints.map((constraint) => (
            <span
              key={constraint}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[var(--plan-text-secondary)]"
            >
              {constraint}
            </span>
          ))}
        </div>
      )}

      {artifact.openQuestions.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold tracking-widest text-[var(--plan-text-muted)] uppercase mb-2">
            Open Questions
          </p>
          <div className="space-y-1.5">
            {artifact.openQuestions.slice(0, 3).map((question) => (
              <div key={question} className="flex gap-2 items-start text-xs text-[var(--plan-text-secondary)]">
                <span className="text-amber-500/70 shrink-0">?</span>
                {question}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─── */

export default function PlanningChat() {
  const router = useRouter();
  const threads = useQuery(api.chatThreads.listIdeationThreads, { includeArchived: false }) ?? [];
  const createThread = useMutation(api.chatThreads.createIdeationThread);
  const appendMessage = useMutation(api.chatThreads.appendMessage);
  const archiveThread = useMutation(api.chatThreads.archiveThread);
  const createProjectFromIdeation = useMutation(api.projects.createFromIdeation);
  const createWorkspaceThreadForProject = useMutation(api.chatThreads.createWorkspaceThreadForProject);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [artifact, setArtifact] = useState<IdeationArtifact | null>(null);
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [latestGeneration, setLatestGeneration] = useState<GenerationMarker | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncedThreadRef = useRef<string | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => String(thread._id) === threadId) ?? null,
    [threads, threadId]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!activeThread) {
      if (threadId) {
        setMessages([]);
      }
      setArtifact(null);
      setSuggestedIds([]);
      setSelectedIds([]);
      setLatestGeneration(null);
      syncedThreadRef.current = null;
      return;
    }

    const activeId = String(activeThread._id);
    if (syncedThreadRef.current === activeId) {
      return;
    }

    syncedThreadRef.current = activeId;
    const hydratedMessages = (activeThread.messages ?? []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: stripHiddenContent(msg.content),
    }));
    setMessages(hydratedMessages);

    const rawMessages = (activeThread.messages ?? []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const latestArtifact = [...rawMessages]
      .reverse()
      .map((msg) => parseArtifactFromText(msg.content))
      .find((value) => value !== null) ?? null;
    setArtifact(latestArtifact);

    const latestSuggestion = findLatestSuggestedComponents(rawMessages);
    const latestGenerationMarker = findLatestGeneration(rawMessages);
    const shouldShowSuggestions =
      latestSuggestion &&
      (!latestGenerationMarker || latestSuggestion.index > latestGenerationMarker.index);

    setLatestGeneration(latestGenerationMarker?.data ?? null);
    setSuggestedIds(shouldShowSuggestions ? latestSuggestion.ids : []);
    setSelectedIds(shouldShowSuggestions ? latestSuggestion.ids : []);
    setError(null);
  }, [activeThread, threadId]);

  async function ensureThread(): Promise<string> {
    if (threadId) return threadId;
    const created = await createThread({});
    const id = String(created);
    setThreadId(id);
    syncedThreadRef.current = id;
    return id;
  }

  const startNewChat = () => {
    setError(null);
    setThreadId(null);
    syncedThreadRef.current = null;
    setMessages([]);
    setArtifact(null);
    setSuggestedIds([]);
    setSelectedIds([]);
    setLatestGeneration(null);
    setInput("");
  };

  const loadThread = (id: string) => {
    setThreadId(id);
  };

  const handleDeleteThread = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await archiveThread({ threadId: id as any });
      if (threadId === id) {
        const remaining = threads.filter((thread) => String(thread._id) !== id);
        setThreadId(remaining[0] ? String(remaining[0]._id) : null);
        setMessages([]);
        setArtifact(null);
        setSuggestedIds([]);
        setSelectedIds([]);
        setLatestGeneration(null);
      }
    } catch {
      // best effort
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    let nextMessages: { role: "user" | "assistant"; content: string }[] = messages;
    try {
      const ensuredThreadId = await ensureThread();
      const userMessage = { role: "user" as const, content: trimmed };
      nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");

      await appendMessage({
        threadId: ensuredThreadId as any,
        role: "user",
        content: trimmed,
      });

      const response = await sendPlanMessage(nextMessages, artifact);
      const assistantText = stripHiddenContent(response.message || response.assistantMessage || "");
      const artifactFromResponse = response.artifact ?? null;
      const componentIds = normalizeComponentIds(
        (response.suggested_component_ids ?? response.suggestedComponentIds ?? []).map((id) =>
          String(id)
        )
      );

      const fullHistory = [...nextMessages, { role: "assistant" as const, content: assistantText }];
      setMessages(fullHistory);
      setArtifact(artifactFromResponse);

      try {
        let persistedAssistantContent = attachArtifactToText(assistantText, artifactFromResponse);
        persistedAssistantContent = attachComponentIdsToText(persistedAssistantContent, componentIds);
        await appendMessage({
          threadId: ensuredThreadId as any,
          role: "assistant",
          content: persistedAssistantContent,
        });
      } catch (persistError) {
        console.error("Failed to persist assistant ideation message:", persistError);
        setError(
          "Response shown, but we could not fully save it to chat history. Continue chatting and it will resync."
        );
      }

      if (componentIds.length > 0) {
        setSuggestedIds(componentIds);
        setSelectedIds(componentIds);
        setLatestGeneration(null);
      } else {
        setSuggestedIds([]);
        setSelectedIds([]);
      }
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Something went wrong";
      setError(msg);
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    send(prompt);
  };

  const toggleComponent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const ensuredThreadId = await ensureThread();
      const description = messages.length
        ? stripComponentIdsLine(messages[messages.length - 1]?.content || "").slice(0, 200)
        : "";

      const payload: Record<string, unknown> = {
        threadId: ensuredThreadId as any,
        selectedComponentIds: selectedIds,
        name: activeThread?.title || "My Architecture",
        constraints: mapArtifactToProjectConstraints(artifact) as any,
      };
      if (description.trim().length > 0) {
        payload.description = description;
      }

      const projectId = await createProjectFromIdeation(payload as any);

      await createWorkspaceThreadForProject({
        projectId: projectId as any,
      });

      const selectedNames = selectedIds.map((id) => getComponentById(id)?.name ?? id);
      const summaryText = `Architecture generated for this idea.\n\nTools selected:\n${selectedNames
        .map((name) => `- ${name}`)
        .join("\n")}`;
      const generationMarker: GenerationMarker = {
        projectId: String(projectId),
        componentIds: selectedIds,
        createdAt: Date.now(),
      };

      try {
        let persistedSummary = attachComponentIdsToText(summaryText, selectedIds);
        persistedSummary = attachGenerationToText(persistedSummary, generationMarker);
        await appendMessage({
          threadId: ensuredThreadId as any,
          role: "assistant",
          content: persistedSummary,
        });
        setLatestGeneration(generationMarker);
      } catch {
        // best effort
      }

      window.location.href = `/project/${projectId}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to generate project");
    } finally {
      setLoading(false);
    }
  };


  const started = messages.length > 0;
  const showComponentCards = suggestedIds.length > 0;
  const canGenerate =
    showComponentCards &&
    selectedIds.length > 0 &&
    (artifact ? artifact.readyForArchitecture : true);
  const latestGeneratedComponentNames = useMemo(
    () =>
      (latestGeneration?.componentIds ?? []).map(
        (componentId) => getComponentById(componentId)?.name ?? componentId
      ),
    [latestGeneration]
  );

  function sessionPreview(msgs: { role: string; content: string }[]) {
    const first = msgs.find((msg) => msg.role === "user");
    if (!first) return "Empty chat";
    const preview = stripHiddenContent(first.content);
    return preview.length > 50 ? `${preview.slice(0, 50)}...` : preview;
  }

  /* ─── Render ─── */

  return (
    <div
      className="relative flex h-screen w-full overflow-hidden text-[var(--plan-text)]"
      data-theme="plan"
      style={{ background: "#06080D" }}
    >
      {/* Gradient mesh background — replaces particle stars */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Top-center emerald wash */}
        <div
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[160px] opacity-[0.035]"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }}
        />
        {/* Right-side teal accent */}
        <div
          className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.025]"
          style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }}
        />
        {/* Bottom-left warm hint */}
        <div
          className="absolute bottom-[5%] -left-[5%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.02]"
          style={{ background: "radial-gradient(circle, #F59E0B 0%, transparent 70%)" }}
        />
        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(6, 8, 13, 0.6) 100%)" }}
        />
      </div>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Instrument+Serif:ital@0;1&display=swap"
        rel="stylesheet"
      />

      {/* ─── Sidebar ─── */}
      <aside
        className={`relative z-10 shrink-0 border-r border-white/[0.04] flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
        style={{ background: "#08090E" }}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.04] shrink-0">
          <span
            className="text-[13px] font-medium text-[var(--plan-text-secondary)] tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Chats
          </span>
          <button
            type="button"
            onClick={startNewChat}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--plan-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/[0.08] transition-all duration-200"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {threads.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <MessageSquare className="w-5 h-5 mx-auto mb-2.5 text-[var(--plan-text-muted)] opacity-40" />
              <p className="text-xs text-[var(--plan-text-muted)]">No chats yet</p>
            </div>
          ) : (
            threads.map((thread) => {
              const id = String(thread._id);
              const isActive = threadId === id;
              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => loadThread(id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      loadThread(id);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-[13px] transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? "bg-emerald-500/[0.08] text-[var(--plan-text)]"
                      : "text-[var(--plan-text-secondary)] hover:text-[var(--plan-text)] hover:bg-white/[0.03]"
                  }`}
                >
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{sessionPreview(thread.messages as any)}</span>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteThread(id, event)}
                    className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--plan-text-muted)] hover:text-red-400 transition-all"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="h-14 flex items-center justify-between px-5 border-b border-white/[0.04] shrink-0 backdrop-blur-xl"
          style={{ background: "rgba(8, 9, 14, 0.8)" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--plan-text-muted)] hover:text-[var(--plan-text)] hover:bg-white/[0.04] transition-all duration-200"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2.5">
              <img src="/preflight-logo.png" alt="PreFlight" className="h-5 w-auto object-contain" />
              <span
                className="text-sm font-semibold tracking-wide text-[var(--plan-text)]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Preflight
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all duration-200 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Projects
            </button>
          </div>
        </header>

        {/* ─── Content area ─── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {!started ? (
            /* ─── Empty state / Hero ─── */
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 relative">
              {/* Focused glow behind hero content */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                  className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[100px]"
                  style={{ background: "radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 65%)" }}
                />
              </div>

              <div
                className="relative text-center"
                style={{ animation: "plan-fade-up 0.7s ease both" }}
              >
                <h1
                  className="text-[44px] leading-[1.1] tracking-tight bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent"
                  style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
                >
                  What are you building?
                </h1>
                <p
                  className="mt-3.5 text-[15px] text-[var(--plan-text-secondary)]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Describe your idea and we&apos;ll architect it together
                </p>
              </div>

              <div
                className="flex flex-wrap gap-2.5 justify-center max-w-[560px] relative"
                style={{ animation: "plan-fade-up 0.7s ease 0.12s both" }}
              >
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={loading}
                    className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-[var(--plan-text-secondary)] bg-white/[0.02] border border-slate-400/[0.06] hover:bg-emerald-500/[0.04] hover:border-emerald-500/15 hover:text-[var(--plan-text)] transition-all duration-200 disabled:opacity-50"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      animation: `plan-fade-up 0.5s ease ${0.2 + i * 0.05}s both`,
                    }}
                  >
                    <span className="text-base">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>

              <div
                className="w-full max-w-[680px] relative"
                style={{ animation: "plan-fade-up 0.7s ease 0.25s both" }}
              >
                <div className="plan-input-glow rounded-2xl border border-slate-400/[0.07] bg-[#0C0E15] p-2 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder="Describe what you want to build..."
                    rows={2}
                    className="w-full bg-transparent border-none outline-none resize-none text-[var(--plan-text)] text-sm leading-relaxed py-3 px-3 placeholder:text-[var(--plan-text-muted)]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <div className="flex justify-end items-center px-2 pb-1">
                    <button
                      type="button"
                      onClick={() => send(input)}
                      disabled={!input.trim() || loading}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 disabled:opacity-20 disabled:cursor-default bg-white/[0.04] text-[var(--plan-text-muted)] enabled:bg-emerald-500 enabled:text-white enabled:hover:bg-emerald-400 enabled:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Chat view ─── */
            <>
              <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-6 max-w-[720px] w-full mx-auto"
              >
                <div className="flex flex-col gap-6">
                  {artifact && <ArtifactPanel artifact={artifact} />}

                  {latestGeneration && (
                    <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <p className="text-sm font-semibold text-[var(--plan-text)]">
                          Architecture generated
                        </p>
                      </div>
                      {latestGeneratedComponentNames.length > 0 && (
                        <p className="mt-1 text-xs text-[var(--plan-text-secondary)] pl-4">
                          Tools used: {latestGeneratedComponentNames.join(", ")}
                        </p>
                      )}
                      <Link
                        href={`/project/${latestGeneration.projectId}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors pl-4"
                      >
                        Open generated project
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <MessageBubble
                      key={index}
                      message={msg}
                      suggestedIds={msg.role === "assistant" && index === messages.length - 1 ? suggestedIds : []}
                      selectedIds={selectedIds}
                      onToggleComponent={toggleComponent}
                    />
                  ))}

                  {loading && (
                    <div className="flex items-center gap-2.5 pl-0.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <img src="/preflight-logo.png" alt="" className="w-4 h-4 object-contain" />
                      </div>
                      <TypingIndicator />
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/[0.06] px-4 py-3 rounded-xl border border-red-500/10">
                      {error}
                    </p>
                  )}

                  {canGenerate && (
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] backdrop-blur-sm">
                      <div>
                        <p className="text-sm font-medium text-[var(--plan-text)]">
                          {loading
                            ? "Generating architecture..."
                            : `${selectedIds.length} component${selectedIds.length !== 1 ? "s" : ""} selected`}
                        </p>
                        <p className="text-xs text-[var(--plan-text-secondary)] mt-0.5">
                          {loading
                            ? "This may take a moment"
                            : "Ready to generate your architecture"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 shadow-[0_0_24px_rgba(16,185,129,0.15)] hover:shadow-[0_0_32px_rgba(16,185,129,0.25)] hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:brightness-100"
                        style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {loading ? "Generating..." : "Generate Architecture"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ─── Chat input (active conversation) ─── */}
          {started && (
            <div className="shrink-0 px-6 pb-5 pt-2">
              <div className="max-w-[680px] w-full mx-auto">
                <div className="plan-input-glow rounded-2xl border border-slate-400/[0.06] bg-[#0C0E15] p-1.5 backdrop-blur-sm transition-all duration-300">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder="Continue the conversation..."
                    rows={1}
                    className="w-full bg-transparent border-none outline-none resize-none text-[var(--plan-text)] text-sm leading-relaxed py-2.5 px-3 placeholder:text-[var(--plan-text-muted)]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <div className="flex justify-end items-center px-2 pb-1">
                    <button
                      type="button"
                      onClick={() => send(input)}
                      disabled={!input.trim() || loading}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 disabled:opacity-20 disabled:cursor-default bg-white/[0.04] text-[var(--plan-text-muted)] enabled:bg-emerald-500 enabled:text-white enabled:hover:bg-emerald-400 enabled:shadow-[0_0_16px_rgba(16,185,129,0.2)]"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
