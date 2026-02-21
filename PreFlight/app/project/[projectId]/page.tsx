"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { GenerateModal } from "@/components/workspace/GenerateModal";
import { ExportModal } from "@/components/workspace/ExportModal";
import { CompareModal } from "@/components/workspace/CompareModal";
import { useWorkspaceStore, type ArchNode, type ArchEdge } from "@/lib/store";
import { runScoring } from "@/lib/scoring-engine";
import { runLint } from "@/lib/lint-engine";
import { Loader2 } from "lucide-react";

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

    const {
        nodes,
        edges,
        setNodes,
        setEdges,
        isDirty,
        setIsDirty,
        setIsSaving,
    } = useWorkspaceStore();

    const [showGenerate, setShowGenerate] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showCompare, setShowCompare] = useState(false);
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

    // Initialize canvas from project data
    useEffect(() => {
        if (project && !initializedRef.current) {
            const projectGraph = project.graph as { nodes: ArchNode[]; edges: ArchEdge[] } | undefined;
            if (projectGraph) {
                setNodes(projectGraph.nodes ?? []);
                setEdges(projectGraph.edges ?? []);
            }
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
    }, [project, setNodes, setEdges, setIsDirty]);

    // Debounced save
    useEffect(() => {
        if (!isDirty || !initializedRef.current) return;

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
    }, [isDirty, nodes, edges, projectId, saveGraph, setIsDirty, setIsSaving]);

    // Run scoring and linting
    const handleLint = useCallback(() => {
        const constraints = project?.constraints as Record<string, string> | undefined;
        const newScores = runScoring(nodes, edges, constraints ?? {});
        const newLintIssues = runLint(nodes, edges, constraints ?? {});
        setScores(newScores);
        setLintIssues(newLintIssues);

        // Save to Convex
        saveScoresAndLint({
            projectId: projectId as Id<"projects">,
            scores: newScores,
            lintIssues: newLintIssues,
        }).catch(console.error);
    }, [nodes, edges, project, projectId, saveScoresAndLint]);

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

    return (
        <ReactFlowProvider>
            <div className="h-screen flex flex-col overflow-hidden">
                {/* Toolbar */}
                <Toolbar
                    projectName={project.name}
                    onGenerate={() => setShowGenerate(true)}
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
                        scores={scores}
                        lintIssues={lintIssues}
                    />
                </div>

                {/* Bottom constraints bar */}
                <ConstraintsBar
                    constraints={(project.constraints as Record<string, string>) ?? {}}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onUpdate={handleConstraintsUpdate as any}
                />

                {/* Generate Modal */}
                <GenerateModal
                    open={showGenerate}
                    onOpenChange={setShowGenerate}
                    projectId={projectId}
                    ideaPrompt={project.ideaPrompt ?? ""}
                    constraints={(project.constraints as Record<string, string>) ?? {}}
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
