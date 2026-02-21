"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { extractCanvasActions, stripCanvasActions, type CanvasAction } from "@/lib/assistant-canvas-actions";
import { getComponentByType } from "@/lib/component-catalog";
import { useWorkspaceStore, type ArchEdge, type ArchNode } from "@/lib/store";
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

const LOADING_PHASES = [
    "Reading the canvas...",
    "Reviewing components and connections...",
    "Planning the best update...",
];

const asString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

const asStringArray = (value: unknown): string[] | null => {
    if (!Array.isArray(value)) return null;
    const result = value.filter((item): item is string => typeof item === "string" && item.length > 0);
    return result.length > 0 ? result : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
    typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;

const normalize = (value: string): string => value.trim().toLowerCase();

const resolveNodeId = (nodes: ArchNode[], hint: string | null): string | null => {
    if (!hint) return null;
    const normalizedHint = normalize(hint);

    const directIdMatch = nodes.find((node) => node.id === hint);
    if (directIdMatch) return directIdMatch.id;

    const caseInsensitiveIdMatch = nodes.find((node) => normalize(node.id) === normalizedHint);
    if (caseInsensitiveIdMatch) return caseInsensitiveIdMatch.id;

    const labelMatch = nodes.find((node) => normalize(node.data.label) === normalizedHint);
    if (labelMatch) return labelMatch.id;

    const fuzzyLabelMatch = nodes.find((node) => normalize(node.data.label).includes(normalizedHint));
    return fuzzyLabelMatch?.id ?? null;
};

const ensureUniqueNodeId = (nodes: ArchNode[], preferredId: string): string => {
    if (!nodes.some((node) => node.id === preferredId)) return preferredId;

    let counter = 1;
    while (nodes.some((node) => node.id === `${preferredId}_${counter}`)) {
        counter += 1;
    }
    return `${preferredId}_${counter}`;
};

const ensureUniqueEdgeId = (edges: ArchEdge[], preferredId: string): string => {
    if (!edges.some((edge) => edge.id === preferredId)) return preferredId;

    let counter = 1;
    while (edges.some((edge) => edge.id === `${preferredId}_${counter}`)) {
        counter += 1;
    }
    return `${preferredId}_${counter}`;
};

export function AssistantPanel({
    projectId,
    priorIdeaMessages,
    constraints,
    scores,
    lintIssues,
    queuedPrompt,
}: {
    projectId: string;
    priorIdeaMessages: PriorIdeaMessage[];
    constraints: Record<string, string>;
    scores: Record<string, { score: number; explanation: string }> | null;
    lintIssues: Array<{
        code: string;
        severity: string;
        title: string;
        description: string;
        targets: string[];
        suggestedFix: string;
    }> | null;
    queuedPrompt?: {
        id: number;
        prompt: string;
    } | null;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasHydratedFromDbRef = useRef(false);
    const lastQueuedPromptIdRef = useRef<number | null>(null);
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
        if (!isLoading) {
            setLoadingPhaseIndex(0);
            return;
        }

        const intervalId = setInterval(() => {
            setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
        }, 1400);

        return () => clearInterval(intervalId);
    }, [isLoading]);

    useEffect(() => {
        if (persistedMessages === undefined || hasHydratedFromDbRef.current) return;
        if (messages.length === 0) {
            const hydratedMessages: Message[] = persistedMessages.map((msg) => ({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content,
                createdAt: msg.createdAt,
            }));
            setMessages(hydratedMessages);
        }
        hasHydratedFromDbRef.current = true;
    }, [persistedMessages, messages.length]);

    const applyCanvasAction = useCallback((rawAction: CanvasAction) => {
        const action = asString(rawAction.action)?.toLowerCase();
        if (!action) return;

        const state = useWorkspaceStore.getState();
        const currentNodes = state.nodes;
        const currentEdges = state.edges;

        if (action === "add_component" || action === "add-node" || action === "create_component") {
            const componentType =
                asString(rawAction.componentType) ??
                asString(rawAction.type) ??
                asString(rawAction.component);
            if (!componentType) return;

            const component = getComponentByType(componentType);
            if (!component) return;

            const preferredNodeId =
                asString(rawAction.nodeId) ??
                asString(rawAction.id) ??
                `${componentType}_${Date.now()}`;
            const nodeId = ensureUniqueNodeId(currentNodes, preferredNodeId);
            const x = asNumber(rawAction.x) ?? 80 + (currentNodes.length % 4) * 260;
            const y = asNumber(rawAction.y) ?? 80 + Math.floor(currentNodes.length / 4) * 180;
            const label = asString(rawAction.label) ?? component.label;
            const provider = asString(rawAction.provider) ?? component.provider;
            const configPatch = asRecord(rawAction.config) ?? {};
            const tags = asStringArray(rawAction.tags) ?? component.tags;

            const newNode: ArchNode = {
                id: nodeId,
                type: "custom",
                position: { x, y },
                data: {
                    type: component.type,
                    category: component.category,
                    label,
                    provider,
                    icon: component.icon,
                    config: { ...component.defaultConfig, ...configPatch },
                    tags,
                },
            };

            state.setNodes([...currentNodes, newNode]);
            return;
        }

        if (action === "remove_component" || action === "delete_component" || action === "remove-node") {
            const nodeHint =
                asString(rawAction.nodeId) ??
                asString(rawAction.id) ??
                asString(rawAction.label);
            const nodeId = resolveNodeId(currentNodes, nodeHint);
            if (!nodeId) return;

            state.removeNode(nodeId);
            return;
        }

        if (action === "move_component" || action === "move-node" || action === "reposition_component") {
            const nodeHint =
                asString(rawAction.nodeId) ??
                asString(rawAction.id) ??
                asString(rawAction.label);
            const nodeId = resolveNodeId(currentNodes, nodeHint);
            if (!nodeId) return;

            const x = asNumber(rawAction.x);
            const y = asNumber(rawAction.y);
            if (x === null && y === null) return;

            state.setNodes(
                currentNodes.map((node) =>
                    node.id !== nodeId
                        ? node
                        : {
                            ...node,
                            position: {
                                x: x ?? node.position.x,
                                y: y ?? node.position.y,
                            },
                        }
                )
            );
            return;
        }

        if (action === "update_component" || action === "edit_component") {
            const nodeHint =
                asString(rawAction.nodeId) ??
                asString(rawAction.id) ??
                asString(rawAction.label);
            const nodeId = resolveNodeId(currentNodes, nodeHint);
            if (!nodeId) return;

            const label = asString(rawAction.newLabel) ?? asString(rawAction.label);
            const provider = asString(rawAction.provider);
            const configPatch = asRecord(rawAction.config);
            const tags = asStringArray(rawAction.tags);

            state.setNodes(
                currentNodes.map((node) =>
                    node.id !== nodeId
                        ? node
                        : {
                            ...node,
                            data: {
                                ...node.data,
                                label: label ?? node.data.label,
                                provider: provider ?? node.data.provider,
                                tags: tags ?? node.data.tags,
                                config: configPatch ? { ...node.data.config, ...configPatch } : node.data.config,
                            },
                        }
                )
            );
            return;
        }

        if (action === "connect_components" || action === "add_connection" || action === "connect") {
            const sourceHint =
                asString(rawAction.sourceId) ??
                asString(rawAction.source) ??
                asString(rawAction.from) ??
                asString(rawAction.sourceLabel);
            const targetHint =
                asString(rawAction.targetId) ??
                asString(rawAction.target) ??
                asString(rawAction.to) ??
                asString(rawAction.targetLabel);

            const sourceId = resolveNodeId(currentNodes, sourceHint);
            const targetId = resolveNodeId(currentNodes, targetHint);
            if (!sourceId || !targetId || sourceId === targetId) return;

            const relationshipType =
                asString(rawAction.relationshipType) ??
                asString(rawAction.relationship) ??
                "invokes";
            const protocol = asString(rawAction.protocol) ?? "RPC";

            const alreadyConnected = currentEdges.some(
                (edge) =>
                    edge.source === sourceId &&
                    edge.target === targetId &&
                    (edge.data?.relationshipType ?? "invokes") === relationshipType
            );
            if (alreadyConnected) return;

            const preferredEdgeId =
                asString(rawAction.edgeId) ?? `${sourceId}_${targetId}_${relationshipType}`;
            const edgeId = ensureUniqueEdgeId(currentEdges, preferredEdgeId);

            const newEdge: ArchEdge = {
                id: edgeId,
                type: "custom",
                source: sourceId,
                target: targetId,
                animated: true,
                data: {
                    relationshipType,
                    protocol,
                },
            };

            state.setEdges([...currentEdges, newEdge]);
            return;
        }

        if (action === "remove_connection" || action === "delete_connection" || action === "disconnect") {
            const edgeId = asString(rawAction.edgeId);
            if (edgeId) {
                state.setEdges(currentEdges.filter((edge) => edge.id !== edgeId));
                return;
            }

            const sourceHint =
                asString(rawAction.sourceId) ??
                asString(rawAction.source) ??
                asString(rawAction.from) ??
                asString(rawAction.sourceLabel);
            const targetHint =
                asString(rawAction.targetId) ??
                asString(rawAction.target) ??
                asString(rawAction.to) ??
                asString(rawAction.targetLabel);
            const sourceId = resolveNodeId(currentNodes, sourceHint);
            const targetId = resolveNodeId(currentNodes, targetHint);
            if (!sourceId || !targetId) return;

            state.setEdges(
                currentEdges.filter((edge) => !(edge.source === sourceId && edge.target === targetId))
            );
        }
    }, []);

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim() || isLoading) return;

        const userMessageRecord: Message = {
            role: "user",
            content: userMessage,
            createdAt: Date.now(),
        };
        const assistantCreatedAt = Date.now();
        const newMessages: Message[] = [...messages, userMessageRecord];
        setMessages([
            ...newMessages,
            { role: "assistant", content: "", createdAt: assistantCreatedAt },
        ]);
        void persistMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
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
                            id: e.id,
                            source: e.source,
                            target: e.target,
                            type: (e.data as { relationshipType?: string })?.relationshipType ?? "invokes",
                        })),
                        priorIdeaMessages: priorIdeaMessages.map((m) => ({
                            role: m.role,
                            content: m.content,
                        })),
                        constraints,
                        scores,
                        lintIssues,
                    },
                }),
            });

            if (!response.ok) throw new Error("Failed to get response");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantRawMessage = "";
            let appliedActionCount = 0;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    assistantRawMessage += chunk;

                    const parsedActions = extractCanvasActions(assistantRawMessage);
                    if (parsedActions.length > appliedActionCount) {
                        const nextActions = parsedActions.slice(appliedActionCount);
                        nextActions.forEach(applyCanvasAction);
                        appliedActionCount = parsedActions.length;
                    }

                    const visibleAssistantContent = stripCanvasActions(assistantRawMessage);
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            role: "assistant",
                            content: visibleAssistantContent,
                            createdAt: assistantCreatedAt,
                        };
                        return updated;
                    });
                }
            }

            const finalVisibleContent = stripCanvasActions(assistantRawMessage);
            const finalAssistantContent =
                finalVisibleContent.length > 0
                    ? finalVisibleContent
                    : appliedActionCount > 0
                        ? "Applied the requested canvas updates."
                        : "";

            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: finalAssistantContent,
                    createdAt: assistantCreatedAt,
                };
                return updated;
            });

            const finalMessages = [
                ...newMessages,
                {
                    role: "assistant" as const,
                    content: finalAssistantContent,
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
    }, [
        applyCanvasAction,
        constraints,
        edges,
        isLoading,
        lintIssues,
        messages,
        nodes,
        persistMessages,
        priorIdeaMessages,
        projectId,
        scores,
    ]);

    useEffect(() => {
        if (!queuedPrompt) return;
        if (isLoading) return;
        if (lastQueuedPromptIdRef.current === queuedPrompt.id) return;

        lastQueuedPromptIdRef.current = queuedPrompt.id;
        void sendMessage(queuedPrompt.prompt);
    }, [queuedPrompt, isLoading, sendMessage]);

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
                                <div className="relative overflow-hidden rounded-md border border-border/60 bg-background/70 px-2.5 py-2 min-w-[200px]">
                                    <div className="absolute inset-0 shimmer opacity-25" />
                                    <div className="relative flex items-center gap-1.5">
                                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                        <span className="text-[11px] font-medium text-foreground/90">
                                            {LOADING_PHASES[loadingPhaseIndex]}
                                        </span>
                                    </div>
                                </div>
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
