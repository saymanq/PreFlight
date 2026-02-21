"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowUp,
    Sparkles,
    MessageSquare,
    Loader2,
    ArrowRight,
} from "lucide-react";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    createdAt: number;
}

interface ExtractedContext {
    appIdea?: string;
    features?: string[];
    constraints?: Record<string, string>;
}

interface IdeaChatProps {
    projectId: string;
    projectName: string;
    initialMessages?: ChatMessage[];
    onTransitionToArchitecture: (context: ExtractedContext) => Promise<void> | void;
}

// Parse extracted JSON from assistant response
function parseExtractedContext(content: string): ExtractedContext | null {
    const match = content.match(/```extracted\s*\r?\n([\s\S]*?)```/i);
    if (!match) return null;
    try {
        return JSON.parse(match[1].trim());
    } catch {
        return null;
    }
}

function hasValidExtractedContext(extracted: ExtractedContext | null): extracted is ExtractedContext {
    if (!extracted?.appIdea?.trim()) return false;
    if (!Array.isArray(extracted.features) || extracted.features.length < 3) return false;
    const constraints = extracted.constraints;
    if (!constraints) return false;
    return Boolean(
        constraints.budgetLevel &&
        constraints.teamSize &&
        constraints.timeline &&
        constraints.trafficExpectation &&
        constraints.devExperiencePreference
    );
}

// Check if response has the ready marker
function hasReadyMarker(content: string): boolean {
    return content.includes("[READY_TO_GENERATE]");
}

// Strip markers from display text
function cleanDisplayContent(content: string): string {
    return content
        .replace(/```extracted\s*\r?\n[\s\S]*?```\s*/gi, "")
        .replace(/\[READY_TO_GENERATE\]\s*/g, "")
        .trim();
}

export function IdeaChat({
    projectId,
    projectName,
    initialMessages,
    onTransitionToArchitecture,
}: IdeaChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasStarted, setHasStarted] = useState((initialMessages?.length ?? 0) > 0);
    const [latestExtracted, setLatestExtracted] = useState<ExtractedContext | null>(null);
    const [showReadyButtons, setShowReadyButtons] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveChatHistory = useMutation(api.projects.saveChatHistory);
    const saveTimeoutRef = useRef<NodeJS.Timeout>(undefined);

    // Restore ready state after refresh if the latest assistant message was ready.
    useEffect(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            if (msg.role !== "assistant") continue;
            if (!hasReadyMarker(msg.content)) continue;

            const extracted = parseExtractedContext(msg.content);
            if (hasValidExtractedContext(extracted)) {
                setLatestExtracted(extracted);
                setShowReadyButtons(true);
            }
            return;
        }
        setShowReadyButtons(false);
    }, [messages]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Debounced save
    const debouncedSave = useCallback(
        (msgs: ChatMessage[]) => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                saveChatHistory({
                    projectId: projectId as Id<"projects">,
                    messages: msgs,
                }).catch(console.error);
            }, 2000);
        },
        [projectId, saveChatHistory]
    );

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isStreaming) return;

        if (!hasStarted) setHasStarted(true);
        setShowReadyButtons(false);

        const userMessage: ChatMessage = {
            role: "user",
            content: trimmed,
            createdAt: Date.now(),
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setIsStreaming(true);

        // Resize textarea back
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        try {
            const response = await fetch("/api/chat/idea", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!response.ok) throw new Error("Chat failed");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader");

            const decoder = new TextDecoder();
            let fullText = "";

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: "",
                createdAt: Date.now(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...assistantMessage,
                        content: fullText,
                    };
                    return updated;
                });
            }

            // Show ready actions only when marker and extracted payload are valid.
            if (hasReadyMarker(fullText)) {
                const extracted = parseExtractedContext(fullText);
                if (hasValidExtractedContext(extracted)) {
                    setLatestExtracted(extracted);
                    setShowReadyButtons(true);
                }
            }

            // Save chat history
            const finalMessages = [
                ...updatedMessages,
                { ...assistantMessage, content: fullText },
            ];
            debouncedSave(finalMessages);
        } catch (err) {
            console.error("Chat error:", err);
            setMessages((prev) => [
                ...prev.slice(0, -1),
                {
                    role: "assistant" as const,
                    content: "Sorry, something went wrong. Please try again.",
                    createdAt: Date.now(),
                },
            ]);
        } finally {
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCreateArchitecture = async () => {
        setIsTransitioning(true);
        try {
            await onTransitionToArchitecture(
                latestExtracted ?? { appIdea: "", features: [], constraints: {} }
            );
        } catch (err) {
            console.error("Transition to architecture failed:", err);
            setIsTransitioning(false);
        }
    };

    const handleContinue = () => {
        setShowReadyButtons(false);
        textareaRef.current?.focus();
    };

    // Auto-resize textarea
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    };

    return (
        <div className="h-screen flex flex-col bg-background relative overflow-hidden">
            {/* Header */}
            <div className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6">
                <h1 className="text-sm font-semibold text-foreground">{projectName}</h1>
            </div>

            <div className="flex-1 flex flex-col relative min-h-0">
                <AnimatePresence mode="wait">
                    {!hasStarted ? (
                        /* Initial centered state */
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -40, transition: { duration: 0.3 } }}
                            className="flex-1 flex flex-col items-center justify-center px-4"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                                    What do you want to build?
                                </h2>
                                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                    Describe your app idea and I&apos;ll help you refine it into a
                                    buildable architecture plan.
                                </p>
                            </div>

                            <div className="w-full max-w-2xl">
                                <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-lg p-4">
                                    <Textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={handleTextareaChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="I want to build a..."
                                        className="border-0 bg-transparent resize-none focus-visible:ring-0 text-base placeholder:text-muted-foreground/50 min-h-[60px] max-h-[160px] p-0"
                                        rows={2}
                                    />
                                    <div className="flex items-center justify-end mt-2">
                                        <Button
                                            size="sm"
                                            onClick={handleSend}
                                            disabled={!input.trim()}
                                            className="h-8 w-8 p-0 rounded-full"
                                        >
                                            <ArrowUp className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* Chat state */
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            {/* Messages area */}
                            <div className="flex-1 overflow-y-auto px-4 py-6">
                                <div className="max-w-2xl mx-auto space-y-6">
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            {msg.role === "user" ? (
                                                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-3 text-sm">
                                                    {msg.content}
                                                </div>
                                            ) : (
                                                <div className="max-w-[85%] flex gap-3">
                                                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                    </div>
                                                    <div className="text-sm text-foreground leading-relaxed prose prose-sm prose-invert max-w-none">
                                                        {cleanDisplayContent(msg.content)
                                                            .split("\n")
                                                            .map((line, j) => (
                                                                <React.Fragment key={j}>
                                                                    {line}
                                                                    {j < cleanDisplayContent(msg.content).split("\n").length - 1 && <br />}
                                                                </React.Fragment>
                                                            ))}
                                                        {isStreaming && i === messages.length - 1 && (
                                                            <span className="inline-block w-1.5 h-4 bg-primary/50 animate-pulse ml-0.5 align-text-bottom" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}

                                    {/* Ready to generate buttons */}
                                    {showReadyButtons && !isStreaming && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex gap-3 justify-center pt-4"
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleContinue}
                                                className="gap-2 text-xs"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                Continue Conversation
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleCreateArchitecture}
                                                disabled={isTransitioning}
                                                className="gap-2 text-xs bg-primary hover:bg-primary/90"
                                            >
                                                {isTransitioning ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                )}
                                                Create the Architecture
                                            </Button>
                                        </motion.div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {/* Input area pinned to bottom */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-4"
                            >
                                <div className="max-w-2xl mx-auto">
                                    <div className="relative rounded-2xl border border-border bg-card/80 p-3">
                                        <Textarea
                                            ref={textareaRef}
                                            value={input}
                                            onChange={handleTextareaChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type your message..."
                                            className="border-0 bg-transparent resize-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50 min-h-[40px] max-h-[160px] p-0"
                                            rows={1}
                                            disabled={isStreaming}
                                        />
                                        <div className="flex items-center justify-end mt-1.5">
                                            <Button
                                                size="sm"
                                                onClick={handleSend}
                                                disabled={!input.trim() || isStreaming}
                                                className="h-7 w-7 p-0 rounded-full"
                                            >
                                                {isStreaming ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
