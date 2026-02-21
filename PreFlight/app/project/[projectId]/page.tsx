"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "@/components/workspace/Canvas";
import { ComponentSidebar } from "@/components/workspace/ComponentSidebar";
import { RightPanel } from "@/components/workspace/RightPanel";
import { Toolbar } from "@/components/workspace/Toolbar";
import { ConstraintsBar } from "@/components/workspace/ConstraintsBar";
import { ExportModal } from "@/components/workspace/ExportModal";
import { CompareModal } from "@/components/workspace/CompareModal";
import { IdeaChat } from "@/components/project/IdeaChat";
import { useWorkspaceStore, type ArchNode, type ArchEdge } from "@/lib/store";
import { runScoring } from "@/lib/scoring-engine";
import { runLint } from "@/lib/lint-engine";
import { Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectWorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const project = useQuery(api.projects.getById, {
        projectId: projectId as Id<"projects">,
    });
    const saveGraph = useMutation(api.projects.saveGraph);
    const updateConstraints = useMutation(api.projects.updateConstraints);
    const saveScoresAndLint = useMutation(api.projects.saveScoresAndLint);
    const transitionToArchitecture = useMutation(api.projects.transitionToArchitecture);

    const {
        nodes,
        edges,
        setNodes,
        setEdges,
        isDirty,
        setIsDirty,
        setIsSaving,
    } = useWorkspaceStore();

    const [showExport, setShowExport] = useState(false);
    const [showCompare, setShowCompare] = useState(false);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [scores, setScores] = useState<Record<string, { score: number; explanation: string }> | null>(null);
    const [lintIssues, setLintIssues] = useState<Array<{
        code: string;
        severity: string;
        title: string;
        description: string;
        targets: string[];
        suggestedFix: string;
    }> | null>(null);

    const initializedRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout>(undefined);
    const scoreLintSaveTimeoutRef = useRef<NodeJS.Timeout>(undefined);
    const autoGenTriggeredRef = useRef(false);

    // Determine current phase
    const phase = project?.phase ?? "architecture"; // default to architecture for legacy projects
    const currentConstraints = useMemo(
        () => (project?.constraints as Record<string, string>) ?? {},
        [project?.constraints]
    );
    const currentConstraintsKey = useMemo(
        () => JSON.stringify(currentConstraints),
        [currentConstraints]
    );

    // Initialize canvas from project data (architecture phase only)
    useEffect(() => {
        if (project && phase === "architecture" && !initializedRef.current) {
            const projectGraph = project.graph as { nodes: ArchNode[]; edges: ArchEdge[] } | undefined;
            setNodes(projectGraph?.nodes ?? []);
            setEdges(projectGraph?.edges ?? []);
            if (project.scores) {
                setScores(project.scores as Record<string, { score: number; explanation: string }>);
            }
            if (project.lintIssues) {
                setLintIssues(project.lintIssues as Array<{
                    code: string;
                    severity: string;
                    title: string;
                    description: string;
                    targets: string[];
                    suggestedFix: string;
                }>);
            }
            initializedRef.current = true;
            setIsDirty(false);
        }
    }, [project, phase, setNodes, setEdges, setIsDirty]);

    // Debounced save (architecture phase)
    useEffect(() => {
        if (!isDirty || !initializedRef.current || phase !== "architecture") return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await saveGraph({
                    projectId: projectId as Id<"projects">,
                    graph: { nodes, edges },
                });
                setIsDirty(false);
            } catch (err) {
                console.error("Save failed:", err);
            } finally {
                setIsSaving(false);
            }
        }, 1500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [isDirty, nodes, edges, projectId, phase, saveGraph, setIsDirty, setIsSaving]);

    const computeAndPersistScoresAndLint = useCallback(
        async (
            graphNodes: ArchNode[],
            graphEdges: ArchEdge[],
            constraintValues: Record<string, string>
        ) => {
            const newScores = runScoring(graphNodes, graphEdges, constraintValues);
            const newLintIssues = runLint(graphNodes, graphEdges, constraintValues);
            setScores(newScores);
            setLintIssues(newLintIssues);

            await saveScoresAndLint({
                projectId: projectId as Id<"projects">,
                scores: newScores,
                lintIssues: newLintIssues,
            });
        },
        [projectId, saveScoresAndLint]
    );

    // Auto-generate architecture after transition
    const autoGenerate = useCallback(async (ideaPrompt: string, constraints: Record<string, string>) => {
        if (autoGenTriggeredRef.current) return;
        autoGenTriggeredRef.current = true;
        setIsAutoGenerating(true);

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: ideaPrompt, constraints }),
            });

            if (!response.ok) throw new Error("Generation failed");

            const result = await response.json();
            const newNodes = result.nodes ?? [];
            setNodes(newNodes);
            setEdges(result.edges ?? []);
            setIsDirty(true);
            initializedRef.current = true;

            // Save immediately
            await saveGraph({
                projectId: projectId as Id<"projects">,
                graph: { nodes: newNodes, edges: result.edges ?? [] },
            });

        } catch (err) {
            console.error("Auto-generate failed:", err);
            // Allow retry after failure instead of permanently blocking auto-generate.
            autoGenTriggeredRef.current = false;
        } finally {
            setIsAutoGenerating(false);
        }
    }, [projectId, saveGraph, setNodes, setEdges, setIsDirty]);

    // Watch for newly transitioned projects that need auto-generation
    useEffect(() => {
        if (
            project &&
            phase === "architecture" &&
            !autoGenTriggeredRef.current
        ) {
            const graph = project.graph as { nodes: ArchNode[]; edges: ArchEdge[] } | undefined;
            const hasNodes = (graph?.nodes?.length ?? 0) > 0;

            // If we just transitioned and there are no nodes yet, auto-generate
            if (!hasNodes && project.ideaPrompt) {
                autoGenerate(
                    project.ideaPrompt,
                    currentConstraints
                );
            }
        }
    }, [project, phase, autoGenerate, currentConstraints]);

    // Recompute scores/lint in realtime as the graph changes, then persist debounced.
    useEffect(() => {
        if (phase !== "architecture" || !initializedRef.current) return;
        const constraintsForRealtime = JSON.parse(currentConstraintsKey) as Record<string, string>;

        const currentNodes = nodes as ArchNode[];
        const currentEdges = edges as ArchEdge[];

        const newScores = runScoring(currentNodes, currentEdges, constraintsForRealtime);
        const newLintIssues = runLint(currentNodes, currentEdges, constraintsForRealtime);
        setScores(newScores);
        setLintIssues(newLintIssues);

        if (scoreLintSaveTimeoutRef.current) {
            clearTimeout(scoreLintSaveTimeoutRef.current);
        }

        scoreLintSaveTimeoutRef.current = setTimeout(() => {
            saveScoresAndLint({
                projectId: projectId as Id<"projects">,
                scores: newScores,
                lintIssues: newLintIssues,
            }).catch((err) => {
                console.error("Realtime score/lint save failed:", err);
            });
        }, 800);

        return () => {
            if (scoreLintSaveTimeoutRef.current) {
                clearTimeout(scoreLintSaveTimeoutRef.current);
            }
        };
    }, [nodes, edges, currentConstraintsKey, phase, projectId, saveScoresAndLint]);

    // Handle transition from chat to architecture
    const handleTransitionToArchitecture = useCallback(
        async (extractedContext: {
            appIdea?: string;
            features?: string[];
            constraints?: Record<string, string>;
        }) => {
            try {
                await transitionToArchitecture({
                    projectId: projectId as Id<"projects">,
                    extractedContext,
                });
                // Project will reactively update, re-rendering with architecture phase
            } catch (err) {
                console.error("Transition failed:", err);
                throw err;
            }
        },
        [projectId, transitionToArchitecture]
    );

    // Run scoring and linting
    const handleLint = useCallback(() => {
        computeAndPersistScoresAndLint(
            nodes as ArchNode[],
            edges as ArchEdge[],
            currentConstraints
        ).catch(console.error);
    }, [nodes, edges, currentConstraints, computeAndPersistScoresAndLint]);

    const handleConstraintsUpdate = useCallback(
        async (newConstraints: Record<string, string | undefined>) => {
            try {
                await updateConstraints({
                    projectId: projectId as Id<"projects">,
                    constraints: newConstraints as {
                        budgetLevel?: string;
                        teamSize?: string;
                        timeline?: string;
                        trafficExpectation?: string;
                        dataSensitivity?: string;
                        regionCount?: string;
                        uptimeTarget?: string;
                        devExperiencePreference?: string;
                        providerPreferences?: string[];
                    },
                });
            } catch (err) {
                console.error("Constraints update failed:", err);
            }
        },
        [projectId, updateConstraints]
    );

    // Loading state
    if (project === undefined) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (project === null) {
        router.push("/dashboard");
        return null;
    }

    // ─────────────────────────────────────────
    // CHAT PHASE
    // ─────────────────────────────────────────
    if (phase === "chat") {
        return (
            <IdeaChat
                projectId={projectId}
                projectName={project.name}
                initialMessages={
                    (project.chatHistory as Array<{
                        role: "user" | "assistant";
                        content: string;
                        createdAt: number;
                    }>) ?? undefined
                }
                onTransitionToArchitecture={handleTransitionToArchitecture}
            />
        );
    }

    // ─────────────────────────────────────────
    // ARCHITECTURE PHASE
    // ─────────────────────────────────────────
    return (
        <ReactFlowProvider>
            <div className="h-screen flex flex-col overflow-hidden">
                {/* Auto-generate overlay */}
                <AnimatePresence>
                    {isAutoGenerating && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                </div>
                                <h2 className="text-xl font-semibold">Generating your architecture</h2>
                                <p className="text-sm text-muted-foreground max-w-md text-center">
                                    Building a tailored architecture based on your conversation. This
                                    usually takes 10-20 seconds...
                                </p>
                                <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Toolbar */}
                <Toolbar
                    projectName={project.name}
                    onCompare={() => setShowCompare(true)}
                    onLint={handleLint}
                    onExport={() => setShowExport(true)}
                />

                {/* Main workspace */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left sidebar */}
                    <ComponentSidebar projectId={projectId} />

                    {/* Canvas */}
                    <Canvas />

                    {/* Right panel */}
                    <RightPanel
                        projectId={projectId}
                        priorIdeaMessages={
                            (project.chatHistory as Array<{
                                role: "user" | "assistant";
                                content: string;
                                createdAt: number;
                            }>) ?? []
                        }
                        constraints={currentConstraints}
                        scores={scores}
                        lintIssues={lintIssues}
                    />
                </div>

                {/* Bottom constraints bar */}
                <ConstraintsBar
                    constraints={currentConstraints}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onUpdate={handleConstraintsUpdate as any}
                />

                {/* Export Modal */}
                <ExportModal
                    open={showExport}
                    onOpenChange={setShowExport}
                    projectName={project.name}
                    nodes={nodes}
                    edges={edges}
                    scores={scores}
                    lintIssues={lintIssues}
                />

                {/* Compare Modal */}
                <CompareModal
                    open={showCompare}
                    onOpenChange={setShowCompare}
                    projectId={projectId}
                />
            </div>
        </ReactFlowProvider>
    );
}
