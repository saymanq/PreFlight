"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { sendPlanMessage } from "@/lib/api";
import { buildGraphFromComponentIds } from "@/lib/generation/graph-builder";
import { COMPONENT_LIBRARY, getComponentById } from "@/lib/components-data";
import { buildReportMarkdown, buildReportHtml } from "@/lib/plan-report";
import {
  ArrowRight,
  FolderOpen,
  Download,
  FileText,
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const QUICK_ACTIONS = [
  { icon: "⚡", label: "SaaS App", prompt: "I want to build a SaaS application" },
  { icon: "🤖", label: "AI Agent", prompt: "I want to build an AI agent or assistant" },
  { icon: "🛒", label: "Marketplace", prompt: "I want to build a marketplace" },
  { icon: "💬", label: "Realtime Chat", prompt: "I want to build a real-time chat app" },
  { icon: "📊", label: "Dashboard", prompt: "I want to build an analytics dashboard" },
];

function stripComponentIdsLine(text: string): string {
  return text.replace(/\n?\s*COMPONENT_IDS:\s*[^\n]+/i, "").trim();
}

function getCategoryForComponent(componentId: string): string {
  for (const cat of COMPONENT_LIBRARY) {
    if (cat.components.some((c) => c.id === componentId)) return cat.name;
  }
  return "Component";
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--plan-text-muted)] animate-bounce"
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
      className={`relative w-full text-left rounded-2xl p-4 transition-all duration-200 border-2 ${
        selected
          ? "bg-[var(--plan-bg-selected)] border-[var(--plan-accent)] shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "bg-[var(--plan-bg-card)] border-[var(--plan-border)] hover:bg-[var(--plan-bg-card-hover)] hover:border-[var(--plan-border-light)] hover:-translate-y-px"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-[var(--plan-bg-chip)]"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)" }}
        >
          {comp.icon.startsWith("http") ? (
            <img src={comp.icon} alt="" className="w-4 h-4 object-contain" />
          ) : (
            <span className="text-base">{comp.icon}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--plan-text)] truncate">{comp.name}</div>
          <div className="text-[11px] text-[var(--plan-text-muted)]">{categoryName}</div>
        </div>
      </div>
      <ul className="space-y-1 mb-2">
        {benefits.slice(0, 3).map((benefit, i) => (
          <li key={i} className="text-xs text-[var(--plan-text-secondary)] flex gap-1.5 items-start">
            <span className="text-[var(--plan-success)] mt-0.5">●</span>
            {benefit}
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center text-[11px] text-[var(--plan-text-muted)]">
        <span>{costLabel}</span>
      </div>
      {selected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--plan-accent)] rounded-b-2xl" />}
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
  const displayContent = isUser ? message.content : stripComponentIdsLine(message.content);

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
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5 max-w-full`}>
      {!isUser && (
        <div className="flex items-center gap-2 pl-0.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-[var(--plan-text-inverse)] bg-gradient-to-br from-[var(--plan-accent)] to-[#8a6d2b]"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            P
          </div>
          <span className="text-xs font-medium text-[var(--plan-text-muted)]">Preflight</span>
        </div>
      )}
      <div
        className={
          isUser
            ? "rounded-2xl px-4 py-3 text-sm leading-relaxed text-[var(--plan-text-secondary)] bg-[var(--plan-bg-chip)] border border-[var(--plan-border)] max-w-[520px]"
            : "text-sm leading-relaxed text-[var(--plan-text-secondary)] px-0.5 max-w-full"
        }
        style={isUser ? { boxShadow: "0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)" } : undefined}
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

export default function PlanningChat() {
  const threads = useQuery(api.chatThreads.listIdeationThreads, { includeArchived: false }) ?? [];
  const createThread = useMutation(api.chatThreads.createIdeationThread);
  const appendMessage = useMutation(api.chatThreads.appendMessage);
  const archiveThread = useMutation(api.chatThreads.archiveThread);
  const createProjectFromIdeation = useMutation(api.projects.createFromIdeation);
  const createWorkspaceThreadForProject = useMutation(api.chatThreads.createWorkspaceThreadForProject);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const syncedThreadRef = useRef<string | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => String(thread._id) === threadId) ?? null,
    [threads, threadId]
  );

  useEffect(() => {
    if (!threadId && threads.length > 0) {
      setThreadId(String(threads[0]._id));
    }
  }, [threads, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!activeThread) {
      if (threadId) {
        setMessages([]);
      }
      syncedThreadRef.current = null;
      return;
    }

    const activeId = String(activeThread._id);
    // Hydrate only when switching threads. Do not re-hydrate while chatting,
    // otherwise local optimistic assistant responses can be overwritten.
    if (syncedThreadRef.current === activeId) {
      return;
    }

    syncedThreadRef.current = activeId;
    setMessages(
      (activeThread.messages ?? []).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }))
    );
    setSuggestedIds([]);
    setSelectedIds([]);
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

  const startNewChat = async () => {
    setError(null);
    const created = await createThread({});
    const id = String(created);
    setThreadId(id);
    syncedThreadRef.current = id;
    setMessages([]);
    setSuggestedIds([]);
    setSelectedIds([]);
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
        setSuggestedIds([]);
        setSelectedIds([]);
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

      const response = await sendPlanMessage(nextMessages);
      const assistantText = response.message || response.assistantMessage || "";
      const componentIds =
        response.suggested_component_ids ?? response.suggestedComponentIds ?? [];

      const fullHistory = [...nextMessages, { role: "assistant" as const, content: assistantText }];
      setMessages(fullHistory);

      try {
        await appendMessage({
          threadId: ensuredThreadId as any,
          role: "assistant",
          content: assistantText,
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
      } else {
        setSuggestedIds([]);
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
      const { nodes, edges } = buildGraphFromComponentIds(selectedIds);

      const projectId = await createProjectFromIdeation({
        threadId: ensuredThreadId as any,
        selectedComponentIds: selectedIds,
        graph: { nodes, edges },
        name: activeThread?.title || "My Architecture",
        description: messages.length
          ? stripComponentIdsLine(messages[messages.length - 1]?.content || "").slice(0, 200)
          : undefined,
      });

      await createWorkspaceThreadForProject({
        projectId: projectId as any,
      });

      window.location.href = `/project/${projectId}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to generate project");
    } finally {
      setLoading(false);
    }
  };

  function downloadMarkdown(filename: string) {
    const md = buildReportMarkdown({
      selectedIds,
      messages,
      title: "Architecture Report - Preflight",
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function openPrintPdf() {
    const html = buildReportHtml({
      selectedIds,
      messages,
      title: "Architecture Report - Preflight",
    });
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    setExportOpen(false);
  }

  const started = messages.length > 0;
  const showComponentCards = suggestedIds.length > 0;
  const canGenerate = showComponentCards && selectedIds.length > 0;

  function sessionPreview(msgs: { role: string; content: string }[]) {
    const first = msgs.find((msg) => msg.role === "user");
    if (!first) return "Empty chat";
    return first.content.length > 50 ? `${first.content.slice(0, 50)}...` : first.content;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--plan-bg)] text-[var(--plan-text)]" data-theme="plan">
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Instrument+Serif&display=swap"
        rel="stylesheet"
      />

      <aside className={`shrink-0 border-r border-[var(--plan-border)] bg-[var(--plan-bg)] flex flex-col transition-all duration-200 ${sidebarOpen ? "w-64" : "w-0 overflow-hidden"}`}>
        <div className="h-14 flex items-center justify-between px-3 border-b border-[var(--plan-border)] shrink-0">
          <span className="text-sm font-semibold text-[var(--plan-text)]">Chats</span>
          <button type="button" onClick={startNewChat} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--plan-text-muted)] hover:text-[var(--plan-text)] hover:bg-[var(--plan-bg-chip)] transition-colors" title="New chat">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {threads.length === 0 ? (
            <div className="px-2 py-4 text-xs text-[var(--plan-text-muted)]">No chats yet</div>
          ) : (
            threads.map((thread) => {
              const id = String(thread._id);
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
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition-colors group cursor-pointer ${
                    threadId === id
                      ? "bg-[var(--plan-bg-selected)] text-[var(--plan-text)]"
                      : "text-[var(--plan-text-secondary)] hover:bg-[var(--plan-bg-chip)]"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{sessionPreview(thread.messages as any)}</span>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteThread(id, event)}
                    className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--plan-text-muted)] hover:text-red-400 transition-opacity"
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--plan-border)] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--plan-text-muted)] hover:text-[var(--plan-text)] hover:bg-[var(--plan-bg-chip)] transition-colors"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-[var(--plan-text-inverse)] bg-gradient-to-br from-[var(--plan-accent)] to-[#8a6d2b]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              P
            </div>
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
              preflight
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--plan-text-secondary)] hover:text-[var(--plan-text)] hover:bg-[var(--plan-bg-chip)] transition-colors border border-transparent hover:border-[var(--plan-border)]"
                aria-expanded={exportOpen}
                aria-haspopup="true"
              >
                <Download className="w-4 h-4" />
                Export report
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] py-1 rounded-xl bg-[var(--plan-bg-card)] border border-[var(--plan-border)] shadow-lg" role="menu">
                    <button type="button" role="menuitem" onClick={() => downloadMarkdown("architecture-report.md")} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--plan-text)] hover:bg-[var(--plan-bg-chip)]">
                      <FileText className="w-4 h-4" />
                      Markdown (.md)
                    </button>
                    <button type="button" role="menuitem" onClick={() => downloadMarkdown("README.md")} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--plan-text)] hover:bg-[var(--plan-bg-chip)]">
                      <FileText className="w-4 h-4" />
                      README (.md)
                    </button>
                    <button type="button" role="menuitem" onClick={openPrintPdf} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--plan-text)] hover:bg-[var(--plan-bg-chip)]">
                      <Download className="w-4 h-4" />
                      PDF (Print {"->"} Save as PDF)
                    </button>
                  </div>
                </>
              )}
            </div>
            <Link href="/projects" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--plan-text-secondary)] hover:text-[var(--plan-text)] hover:bg-[var(--plan-bg-chip)] transition-colors">
              <FolderOpen className="w-4 h-4" />
              Projects
            </Link>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {!started ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
              <div className="text-center">
                <h1 className="text-4xl font-light tracking-tight text-[var(--plan-text)] mb-2" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
                  preflight
                </h1>
                <p className="text-[15px] text-[var(--plan-text-muted)]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Plan your architecture before you build
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-[540px]">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-[var(--plan-text-secondary)] bg-[var(--plan-bg-chip)] border border-[var(--plan-border)] hover:bg-[var(--plan-bg-chip-hover)] hover:border-[var(--plan-border-light)] hover:-translate-y-px transition-all disabled:opacity-50"
                    style={{ fontFamily: "'DM Sans', sans-serif", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center h-12 px-5 border-b border-[var(--plan-border)] shrink-0">
                <span className="text-sm font-semibold text-[var(--plan-text)]">
                  {threadId ? "Architecture Chat" : "New Architecture"}
                </span>
                <span className="ml-2 text-[11px] text-[var(--plan-text-muted)] px-2 py-0.5 rounded-md bg-[var(--plan-bg-chip)]">
                  Planning
                </span>
              </div>

              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-6 max-w-[720px] w-full mx-auto">
                <div className="flex flex-col gap-6">
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
                    <div className="flex items-center gap-2 pl-0.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-[var(--plan-text-inverse)] bg-gradient-to-br from-[var(--plan-accent)] to-[#8a6d2b]" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                        P
                      </div>
                      <TypingIndicator />
                    </div>
                  )}
                  {error && <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">{error}</p>}
                  {canGenerate && !loading && (
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border-2 border-[var(--plan-accent)] bg-[var(--plan-accent-soft)]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                      <div>
                        <p className="text-sm font-semibold text-[var(--plan-text)]">
                          {selectedIds.length} component{selectedIds.length !== 1 ? "s" : ""} selected
                        </p>
                        <p className="text-xs text-[var(--plan-text-secondary)] mt-0.5">
                          Ready to generate your architecture.
                        </p>
                      </div>
                      <button type="button" onClick={handleGenerate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-[var(--plan-text-inverse)] bg-[var(--plan-accent)] hover:bg-[var(--plan-accent-hover)] hover:-translate-y-px transition-all" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                        Generate Architecture
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className={`shrink-0 ${started ? "px-6 pb-6 pt-2" : "px-6 pb-10"}`}>
            <div className="max-w-[720px] w-full mx-auto">
              <div className="rounded-2xl border-2 border-[var(--plan-border)] bg-[var(--plan-bg-input)] p-1.5 focus-within:border-[var(--plan-border-focus)] transition-colors" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={started ? "Continue the conversation..." : "Describe what you want to build..."}
                  rows={started ? 1 : 2}
                  className="w-full bg-transparent border-none outline-none resize-none text-[var(--plan-text)] text-sm leading-relaxed py-2.5 px-3 placeholder:text-[var(--plan-text-muted)]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <div className="flex justify-between items-center px-2 pb-1">
                  <span className="text-[11px] text-[var(--plan-text-muted)] px-2 py-1 rounded-md bg-[var(--plan-bg-chip)]">
                    Gemini
                  </span>
                  <button
                    type="button"
                    onClick={() => send(input)}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-default bg-[var(--plan-bg-chip)] text-[var(--plan-text-muted)] enabled:bg-[var(--plan-accent)] enabled:text-[var(--plan-text-inverse)] enabled:hover:bg-[var(--plan-accent-hover)]"
                    style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
