"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { useWorkspaceStore } from "@/lib/store";
import { runScoring } from "@/lib/scoring-engine";
import { runLint } from "@/lib/lint-engine";
import { Send, Loader2, Bot, User, Sparkles, DollarSign, TrendingUp, Lightbulb } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
    createdAt: number;
}

interface PriorIdeaMessage {
    role: "user" | "assistant";
    content: string;
    createdAt: number;
}

const QUICK_ACTIONS = [
    { label: "Explain Architecture", icon: Lightbulb, prompt: "Explain this architecture and its key design decisions." },
    { label: "Make It Cheaper", icon: DollarSign, prompt: "How can I make this architecture more cost-effective?" },
    { label: "Make It Scalable", icon: TrendingUp, prompt: "What changes would make this architecture more scalable?" },
    { label: "Generate Alternatives", icon: Sparkles, prompt: "Suggest alternative architectures for this project." },
];

export function AssistantPanel({
    projectId,
    priorIdeaMessages,
    constraints,
}: {
    projectId: string;
    priorIdeaMessages: PriorIdeaMessage[];
    constraints: Record<string, string>;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasHydratedFromDbRef = useRef(false);
    const { nodes, edges } = useWorkspaceStore();
    const persistedMessages = useQuery(api.projects.getAssistantThread, {
        projectId: projectId as Id<"projects">,
    });
    const saveAssistantThread = useMutation(api.projects.saveAssistantThread);

    const persistMessages = useCallback(
        async (msgs: Message[]) => {
            try {
                await saveAssistantThread({
                    projectId: projectId as Id<"projects">,
                    messages: msgs.map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                        createdAt: msg.createdAt,
                    })),
                });
            } catch (err) {
                console.error("Failed to persist assistant messages:", err);
            }
        },
        [projectId, saveAssistantThread]
    );

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (persistedMessages === undefined || hasHydratedFromDbRef.current) return;
        const hydratedMessages: Message[] = persistedMessages.map((msg) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
            createdAt: msg.createdAt,
        }));
        setMessages(hydratedMessages);
        hasHydratedFromDbRef.current = true;
    }, [persistedMessages]);

    const sendMessage = async (userMessage: string) => {
        if (!userMessage.trim() || isLoading) return;

        const userMessageRecord: Message = {
            role: "user",
            content: userMessage,
            createdAt: Date.now(),
        };
        const newMessages: Message[] = [...messages, userMessageRecord];
        setMessages(newMessages);
        void persistMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const latestScores = runScoring(nodes, edges, constraints);
            const latestLintIssues = runLint(nodes, edges, constraints);

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    context: {
                        projectId,
                        nodes: nodes.map((n) => ({
                            id: n.id,
                            type: n.data.type,
                            label: n.data.label,
                            category: n.data.category,
                            provider: n.data.provider,
                        })),
                        edges: edges.map((e) => ({
                            source: e.source,
                            target: e.target,
                            type: (e.data as { relationshipType?: string })?.relationshipType ?? "invokes",
                        })),
                        priorIdeaMessages: priorIdeaMessages.map((m) => ({
                            role: m.role,
                            content: m.content,
                        })),
                        constraints,
                        scores: latestScores,
                        lintIssues: latestLintIssues,
                    },
                }),
            });

            if (!response.ok) throw new Error("Failed to get response");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = "";
            const assistantCreatedAt = Date.now();

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "", createdAt: assistantCreatedAt },
            ]);

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    assistantMessage += chunk;
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            role: "assistant",
                            content: assistantMessage,
                            createdAt: assistantCreatedAt,
                        };
                        return updated;
                    });
                }
            }
            const finalMessages = [
                ...newMessages,
                {
                    role: "assistant" as const,
                    content: assistantMessage,
                    createdAt: assistantCreatedAt,
                },
            ];
            await persistMessages(finalMessages);
        } catch {
            const errorMessage: Message = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please make sure the AI API is configured.",
                createdAt: Date.now(),
            };

            setMessages((prev) => {
                const withoutTrailingEmptyAssistant =
                    prev.length > 0 &&
                        prev[prev.length - 1].role === "assistant" &&
                        prev[prev.length - 1].content === ""
                        ? prev.slice(0, -1)
                        : prev;

                const updated = [...withoutTrailingEmptyAssistant, errorMessage];
                void persistMessages(updated);
                return updated;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="space-y-3">
                        <div className="text-center py-6">
                            <Bot className="h-8 w-8 mx-auto mb-2 text-primary opacity-60" />
                            <p className="text-sm font-medium">Architecture Assistant</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Ask about your architecture or use quick actions
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_ACTIONS.map((action) => (
                                <Button
                                    key={action.label}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto py-2 px-3 text-[10px] text-left justify-start gap-1.5"
                                    onClick={() => sendMessage(action.prompt)}
                                >
                                    <action.icon className="h-3 w-3 shrink-0" />
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {msg.role === "assistant" && (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Bot className="h-3.5 w-3.5 text-primary" />
                            </div>
                        )}
                        <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                                }`}
                        >
                            {msg.content ? (
                                <MarkdownContent
                                    content={msg.content}
                                    className="text-xs [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_pre]:my-1 [&_code]:text-[0.95em]"
                                />
                            ) : (isLoading && i === messages.length - 1 ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : null)}
                        </div>
                        {msg.role === "user" && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="h-3.5 w-3.5" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(input);
                            }
                        }}
                        placeholder="Ask about your architecture..."
                        className="min-h-[36px] max-h-[100px] text-xs resize-none"
                        rows={1}
                    />
                    <Button
                        size="sm"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isLoading}
                        className="h-9 w-9 p-0 shrink-0"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
