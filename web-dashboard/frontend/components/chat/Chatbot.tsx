"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useArchitectureStore } from "@/lib/store";
import { Send, Bot, User, Trash2 } from "lucide-react";
import { generateId } from "@/lib/utils";
import { sendChatMessage } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Chatbot() {
    const {
        chatMessages, addChatMessage, sessionId, setSessionId,
        nodes, edges, scope, clearChat, setNodes, setEdges, updateScope,
        constraints, lintIssues, costEstimate,
    } = useArchitectureStore();
    const createSession = useMutation(api.chatSessions.create);
    const saveSessionMsgs = useMutation(api.chatSessions.saveMessages);
    const deleteConvexSession = useMutation(api.chatSessions.deleteSession);
    const [convexSessionId, setConvexSessionId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const recentActionsRef = useRef<string[]>([]);
    const prevNodeIdsRef = useRef<Set<string>>(new Set());

    const planSessions = useQuery(api.chatSessions.list, { sessionType: "plan" });

    const planContext = useMemo(() => {
        if (!planSessions || planSessions.length === 0) return undefined;
        const summaries: { role: string; content: string }[][] = [];
        for (const session of planSessions) {
            if (session.messages && session.messages.length > 0) {
                summaries.push(
                    session.messages.map((m: any) => ({
                        role: m.role as string,
                        content: m.content as string,
                    }))
                );
            }
        }
        if (summaries.length === 0) return undefined;
        return summaries;
    }, [planSessions]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, isTyping]);

    // Track add/remove actions
    useEffect(() => {
        const currentIds = new Set(
            (nodes as any[]).map((n: any) => n.data?.componentId || n.id)
        );
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

    const handleClear = async () => {
        if (chatMessages.length === 0) return;
        if (confirm("Are you sure you want to clear the conversation history?")) {
            try {
                if (convexSessionId) {
                    await deleteConvexSession({ id: convexSessionId as any });
                    setConvexSessionId(null);
                }
            } catch {
                // best-effort
            }
            clearChat();
            recentActionsRef.current = [];
        }
    };

    const buildCanvasSnapshot = useCallback(() => {
        const nodeList = (nodes as any[]).map((n: any) => ({
            id: n.id,
            componentId: n.data?.componentId || "",
            label: n.data?.label || "",
            category: n.data?.category || "",
        }));

        const edgeList = (edges as any[]).map((e: any) => ({
            source: e.source,
            target: e.target,
        }));

        return {
            nodes: nodeList,
            edges: edgeList,
            scope: scope && typeof scope === "object" ? {
                users: Number(scope.users) || 1000,
                trafficLevel: Math.min(5, Math.max(1, Number(scope.trafficLevel) || 2)),
                dataVolumeGB: Number(scope.dataVolumeGB) || 10,
                regions: Number(scope.regions) || 1,
                availability: Number(scope.availability) || 99.9,
            } : { users: 1000, trafficLevel: 2, dataVolumeGB: 10, regions: 1, availability: 99.9 },
        };
    }, [nodes, edges, scope]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = {
            id: generateId(),
            role: "user" as const,
            content: input,
            timestamp: Date.now(),
        };
        addChatMessage(userMessage);
        const currentInput = input;
        setInput("");
        setIsTyping(true);

        try {
            const architecture = buildCanvasSnapshot();
            const chatWidth = chatContainerRef.current?.offsetWidth || 400;

            const conversationHistory = chatMessages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

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
                sessionId,
                architecture,
                chatWidth,
                {
                    conversation_history: conversationHistory,
                    constraints: constraints as any,
                    lint_issues: lintSnapshot,
                    recent_actions: [...recentActionsRef.current],
                    plan_context: planContext,
                }
            );

            // Persist to Convex
            try {
                let sid = convexSessionId;
                if (!sid) {
                    sid = await createSession({ sessionType: "workspace" }) as unknown as string;
                    setConvexSessionId(sid);
                }
                if (sid) {
                    const allMsgs = [
                        ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
                        { role: "user", content: currentInput },
                        { role: "assistant", content: response.message },
                    ];
                    await saveSessionMsgs({ id: sid as any, messages: allMsgs });
                }
            } catch {
                // best-effort
            }

            const aiMessage = {
                id: generateId(),
                role: "assistant" as const,
                content: response.message,
                timestamp: Date.now(),
            };
            addChatMessage(aiMessage);

            if (response.canvas_action === "update" && response.updated_architecture) {
                setNodes(response.updated_architecture.nodes || []);
                setEdges(response.updated_architecture.edges || []);
                recentActionsRef.current.push("Canvas updated by AI");
            } else if (response.canvas_action === "clear") {
                setNodes([]);
                setEdges([]);
                recentActionsRef.current.push("Canvas cleared by AI");
            }

            if (response.updated_scope) {
                updateScope(response.updated_scope);
                recentActionsRef.current.push(`Scope updated: ${JSON.stringify(response.updated_scope)}`);
            }
        } catch (error) {
            console.error("Failed to get chat response:", error);
            const errMsg = error instanceof Error ? error.message : "Unknown error";
            const content = errMsg.includes("API error")
                ? `Sorry, the request failed (${errMsg}). Check the console or try again.`
                : "Sorry, I couldn't reach the backend. Is it running at http://localhost:8000?";
            const errorMessage = {
                id: generateId(),
                role: "assistant" as const,
                content,
                timestamp: Date.now(),
            };
            addChatMessage(errorMessage);
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
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            AI Architect
                        </h3>
                    </div>
                    <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                        Sees your canvas, constraints &amp; lint in real-time
                    </p>
                </div>
                {chatMessages.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--destructive)] transition-colors"
                        title="Clear conversation"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-[var(--primary)]" />
                        <p className="text-sm text-[var(--foreground-secondary)]">
                            I can see your canvas in real time. Ask me anything.
                        </p>
                        <div className="mt-4 space-y-2">
                            <button
                                onClick={() => setInput("What are the issues with my current architecture?")}
                                className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] transition-colors"
                            >
                                🔍 What are the issues with my architecture?
                            </button>
                            <button
                                onClick={() => setInput("How should I fix the lint errors?")}
                                className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] transition-colors"
                            >
                                🔧 How should I fix the lint errors?
                            </button>
                            <button
                                onClick={() => setInput("What components should I add next?")}
                                className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] transition-colors"
                            >
                                ➕ What components should I add next?
                            </button>
                            <button
                                onClick={() => setInput("How can I reduce costs?")}
                                className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] transition-colors"
                            >
                                💰 How can I reduce costs?
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {chatMessages.map((message) => (
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
                                    className={`max-w-[80%] px-4 py-2 rounded-xl ${message.role === "user"
                                        ? "bg-[#99f6e4] text-black"
                                        : "glass border border-[var(--glass-border)] text-[var(--foreground)]"
                                        }`}
                                >
                                    <div className="text-sm prose prose-sm max-w-none prose-invert">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code: (props: any) => {
                                                    const { children, className, node, inline, ...rest } = props;
                                                    let isInline = inline;
                                                    if (typeof isInline !== 'boolean') {
                                                        const content = String(children).trim();
                                                        const hasNewlines = content.includes('\n');
                                                        const hasLangClass = /language-(\w+)/.test(className || "");
                                                        isInline = !hasNewlines && !hasLangClass;
                                                    }
                                                    return isInline ? (
                                                        <code className="px-1.5 py-0.5 rounded bg-black/20 text-[var(--accent)] font-mono text-xs" {...rest}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <code className="block px-3 py-2 rounded-lg bg-black/30 text-[var(--foreground)] font-mono text-xs overflow-x-auto my-2" {...rest}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                pre: ({ children }) => <div className="my-2">{children}</div>,
                                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                                p: ({ children }) => <p className="my-1">{children}</p>,
                                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                em: ({ children }) => <em className="italic">{children}</em>,
                                                a: ({ children, href }) => (
                                                    <a href={href} className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener noreferrer">
                                                        {children}
                                                    </a>
                                                ),
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                                {message.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-[var(--accent)]" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <div className="glass border border-[var(--glass-border)] px-4 py-2 rounded-xl">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 rounded-full bg-[var(--foreground-secondary)] animate-pulse" />
                                        <div className="w-2 h-2 rounded-full bg-[var(--foreground-secondary)] animate-pulse delay-100" />
                                        <div className="w-2 h-2 rounded-full bg-[var(--foreground-secondary)] animate-pulse delay-200" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--border)]">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ask about your architecture..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="px-4 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
