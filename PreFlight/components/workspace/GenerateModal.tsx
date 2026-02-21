"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore, type ArchNode, type ArchEdge } from "@/lib/store";
import { Sparkles, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface GenerateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    ideaPrompt: string;
    constraints: Record<string, string>;
}

export function GenerateModal({
    open,
    onOpenChange,
    projectId,
    ideaPrompt,
    constraints,
}: GenerateModalProps) {
    const [prompt, setPrompt] = useState(ideaPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setNodes, setEdges, setIsGenerating: setStoreGenerating } = useWorkspaceStore();
    const saveGraph = useMutation(api.projects.saveGraph);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setStoreGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, constraints }),
            });

            if (!response.ok) {
                throw new Error("Generation failed. Check your AI API key.");
            }

            const data = await response.json();

            if (data.nodes && data.edges) {
                // Position nodes in a grid layout
                const positionedNodes: ArchNode[] = data.nodes.map(
                    (node: ArchNode, i: number) => ({
                        ...node,
                        id: node.id || `gen_${node.data.type}_${i}`,
                        type: "custom",
                        position: node.position || {
                            x: (i % 3) * 280 + 100,
                            y: Math.floor(i / 3) * 200 + 100,
                        },
                    })
                );

                const positionedEdges: ArchEdge[] = data.edges.map(
                    (edge: ArchEdge, i: number) => ({
                        ...edge,
                        id: edge.id || `edge_${i}`,
                        type: "custom",
                        animated: true,
                    })
                );

                setNodes(positionedNodes);
                setEdges(positionedEdges);

                // Save to Convex
                await saveGraph({
                    projectId: projectId as Id<"projects">,
                    graph: { nodes: positionedNodes, edges: positionedEdges },
                });

                onOpenChange(false);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Generation failed");
        } finally {
            setIsGenerating(false);
            setStoreGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generate Architecture
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-xs font-medium mb-1.5 block">
                            Describe your app idea
                        </label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Build an AI note-taking app with file uploads, chat, and search for 5k users on a low budget..."
                            className="min-h-[120px] text-sm"
                        />
                    </div>

                    {/* Constraints summary */}
                    <div>
                        <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                            Active Constraints
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(constraints).map(([key, value]) =>
                                value ? (
                                    <Badge key={key} variant="secondary" className="text-[10px]">
                                        {key}: {value}
                                    </Badge>
                                ) : null
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                        className="w-full gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating Architecture...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate Architecture
                            </>
                        )}
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center">
                        Uses Gemini to generate an architecture based on your prompt and constraints
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
