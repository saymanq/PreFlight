"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useArchitectureStore } from "@/lib/architecture-store";
import { Send, Bot, Trash2 } from "lucide-react";
import { generateId } from "@/lib/utils";
import { sendChatMessage } from "@/lib/api";
import { MarkdownContent } from "@/components/ui/markdown-content";

interface ChatbotProps {
  projectId: string;
  sourceIdeationSnapshot?: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  }>;
}

interface VisibleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function Chatbot({ projectId, sourceIdeationSnapshot = [] }: ChatbotProps) {
  const {
    nodes,
    edges,
    scope,
    scores,
    lintIssues,
    costEstimate,
    setNodes,
    setEdges,
    updateScope,
    constraints,
  } = useArchitectureStore();

  const workspaceThread = useQuery(
    api.chatThreads.getWorkspaceThreadByProject,
    projectId ? { projectId: projectId as any } : "skip"
  );

  const createWorkspaceThread = useMutation(api.chatThreads.createWorkspaceThreadForProject);
  const appendMessage = useMutation(api.chatThreads.appendMessage);

  const [messages, setMessages] = useState<VisibleMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recentActionsRef = useRef<string[]>([]);
  const prevNodeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!workspaceThread) {
      setMessages([]);
      return;
    }

    setMessages(
      (workspaceThread.messages ?? []).map((message) => ({
        id: generateId(),
        role: message.role as "user" | "assistant",
        content: message.content,
        timestamp: message.createdAt,
      }))
    );
  }, [workspaceThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const currentIds = new Set((nodes as any[]).map((node: any) => node.data?.componentId || node.id));
    const prevIds = prevNodeIdsRef.current;

    if (prevIds.size > 0) {
      for (const id of currentIds) {
        if (!prevIds.has(id)) {
          recentActionsRef.current.push(`Added component: ${id}`);
        }
      }
      for (const id of prevIds) {
        if (!currentIds.has(id)) {
          recentActionsRef.current.push(`Removed component: ${id}`);
        }
      }
      if (recentActionsRef.current.length > 20) {
        recentActionsRef.current = recentActionsRef.current.slice(-12);
      }
    }

    prevNodeIdsRef.current = currentIds;
  }, [nodes]);

  const handleClear = () => {
    if (messages.length === 0) return;
    if (confirm("Clear visible assistant messages for this workspace session?")) {
      setMessages([]);
      recentActionsRef.current = [];
    }
  };

  const buildCanvasSnapshot = useCallback(() => {
    const nodeList = (nodes as any[]).map((node: any) => ({
      ...node,
      data: {
        ...(node.data ?? {}),
      },
    }));

    const edgeList = (edges as any[]).map((edge: any) => ({
      ...edge,
      data: {
        ...(edge.data ?? {}),
      },
    }));

    return {
      nodes: nodeList,
      edges: edgeList,
      scope:
        scope && typeof scope === "object"
          ? {
              users: Number(scope.users) || 1000,
              trafficLevel: Math.min(5, Math.max(1, Number(scope.trafficLevel) || 2)),
              dataVolumeGB: Number(scope.dataVolumeGB) || 10,
              regions: Number(scope.regions) || 1,
              availability: Number(scope.availability) || 99.9,
            }
          : { users: 1000, trafficLevel: 2, dataVolumeGB: 10, regions: 1, availability: 99.9 },
    };
  }, [nodes, edges, scope]);

  async function ensureWorkspaceThreadId(): Promise<string> {
    if (workspaceThread?._id) return String(workspaceThread._id);
    const created = await createWorkspaceThread({ projectId: projectId as any });
    return String(created);
  }

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: VisibleMessage = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    const conversationHistory = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const threadId = await ensureWorkspaceThreadId();
      await appendMessage({
        threadId: threadId as any,
        role: "user",
        content: currentInput,
      });

      const architecture = buildCanvasSnapshot();
      const lintSnapshot = (lintIssues || []).map((issue: any) => ({
        ruleId: issue.ruleId,
        severity: issue.severity,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        suggestedFix: issue.suggestedFix,
      }));

      const response = await sendChatMessage(
        currentInput,
        undefined,
        architecture,
        chatContainerRef.current?.offsetWidth || 400,
        {
          conversation_history: [...conversationHistory, { role: "user", content: currentInput }],
          constraints: constraints as any,
          lint_issues: lintSnapshot,
          recent_actions: [...recentActionsRef.current],
          source_ideation_snapshot: sourceIdeationSnapshot,
          scores: scores ?? undefined,
          architecture_stats: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            lintIssueCount: lintIssues?.length ?? 0,
            overallScore: scores?.overall ?? null,
          },
          cost_estimate: costEstimate ?? undefined,
        }
      );

      const assistantMessage: VisibleMessage = {
        id: generateId(),
        role: "assistant",
        content: response.message,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      await appendMessage({
        threadId: threadId as any,
        role: "assistant",
        content: response.message,
      });

      if (response.canvas_action === "update" && response.updated_architecture) {
        setNodes(response.updated_architecture.nodes || []);
        setEdges(response.updated_architecture.edges || []);
      } else if (response.canvas_action === "clear") {
        setNodes([]);
        setEdges([]);
      }

      if (response.updated_scope) {
        updateScope(response.updated_scope);
      }
    } catch (error) {
      console.error("Workspace chat failed:", error);
      const errorMessage: VisibleMessage = {
        id: generateId(),
        role: "assistant",
        content: "I could not process that request. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div ref={chatContainerRef} className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">AI Architect</h3>
          </div>
          <p className="text-xs text-[var(--foreground-secondary)] mt-1">
            Uses this workspace and your ideation context as hidden memory
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--destructive)] transition-colors"
            title="Clear visible conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-[var(--primary)]" />
            <p className="text-sm text-[var(--foreground-secondary)]">
              Ask for architecture improvements, fixes, and trade-offs.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-[var(--primary)]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-xl ${
                    message.role === "user"
                      ? "bg-[#99f6e4] text-black"
                      : "glass border border-[var(--glass-border)] text-[var(--foreground)]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownContent
                      content={message.content}
                      className="text-sm break-words [&_code]:bg-black/20 [&_code]:text-[var(--accent)] [&_a]:text-[var(--accent)]"
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div className="glass border border-[var(--glass-border)] rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--foreground-secondary)] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[var(--foreground-secondary)] animate-bounce [animation-delay:120ms]" />
                    <span className="w-2 h-2 rounded-full bg-[var(--foreground-secondary)] animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the assistant to improve your architecture..."
            className="flex-1 resize-none rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="self-end w-10 h-10 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
