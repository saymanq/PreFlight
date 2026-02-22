"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArchitectureCanvas from "@/components/canvas/ArchitectureCanvas";
import ComponentLibrary from "@/components/sidebar/ComponentLibrary";
import RightSidebar, { type RightSidebarTab } from "@/components/sidebar/RightSidebar";
import { useArchitectureStore } from "@/lib/architecture-store";
import { scoreArchitecture } from "@/lib/scoring/score-engine";
import { runLinter } from "@/lib/linting/lint-engine";
import { buildGraphFromComponentIds } from "@/lib/generation/graph-builder";
import {
  ArrowLeft,
  Sparkles,
  GitCompare,
  ShieldCheck,
  FileOutput,
  Undo2,
  Redo2,
  Check,
  Loader2,
} from "lucide-react";

type GenerationStatus = "pending" | "generating" | "ready" | "failed";

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as any } : "skip"
  );

  const updateGraph = useMutation(api.projects.updateGraph);
  const updateMeta = useMutation(api.projects.updateMeta);
  const updateConstraintsMutation = useMutation(api.projects.updateConstraints);
  const updateGenerationState = useMutation(api.projects.updateGenerationState);

  const [projectName, setProjectName] = useState("Untitled Project");
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved] = useState(true);
  const [rightTab, setRightTab] = useState<RightSidebarTab>("scores");
  const [hydrated, setHydrated] = useState(false);
  const [isGeneratingArchitecture, setIsGeneratingArchitecture] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const constraints = useArchitectureStore((s) => s.constraints);
  const setNodes = useArchitectureStore((s) => s.setNodes);
  const setEdges = useArchitectureStore((s) => s.setEdges);
  const setConstraints = useArchitectureStore((s) => s.setConstraints);
  const resetConstraints = useArchitectureStore((s) => s.resetConstraints);
  const setProjectNameInStore = useArchitectureStore((s) => s.setProjectName);
  const setScores = useArchitectureStore((s) => s.setScores);
  const setLintIssues = useArchitectureStore((s) => s.setLintIssues);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const constraintsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedProjectRef = useRef<string | null>(null);
  const didHydrateConstraintsRef = useRef(false);
  const generationStartedForProjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    if (hydratedProjectRef.current === projectId) return;

    didHydrateConstraintsRef.current = false;
    generationStartedForProjectRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!project || !projectId) return;
    if (hydratedProjectRef.current === projectId) return;

    setProjectName(project.name);
    setProjectNameInStore(project.name);
    setNodes((project.graph?.nodes as any[]) ?? []);
    setEdges((project.graph?.edges as any[]) ?? []);
    if (project.constraints) setConstraints(project.constraints as any);
    else resetConstraints();

    hydratedProjectRef.current = projectId;
    setHydrated(true);
  }, [project, projectId, setProjectNameInStore, setNodes, setEdges, setConstraints, resetConstraints]);

  const runArchitectureGeneration = useCallback(async () => {
    if (!projectId || !project) return;

    setIsGeneratingArchitecture(true);
    setGenerationError(null);
    setSaved(false);

    try {
      await updateGenerationState({
        projectId: projectId as any,
        status: "generating",
      });

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: project.description || project.name,
          constraints: project.constraints ?? constraints,
          selectedComponentIds: project.selectedComponentIds ?? [],
          sourceIdeationSnapshot: project.sourceIdeationSnapshot ?? [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed (${response.status})`);
      }

      const data = await response.json();
      const generatedNodes = Array.isArray(data.nodes) ? data.nodes : [];
      const generatedEdges = Array.isArray(data.edges) ? data.edges : [];

      if (generatedNodes.length === 0) {
        throw new Error("Generated architecture returned no nodes");
      }

      setNodes(generatedNodes as any);
      setEdges(generatedEdges as any);

      await updateGraph({
        projectId: projectId as any,
        graph: {
          nodes: generatedNodes as any,
          edges: generatedEdges as any,
        },
      });

      const assumptions = Array.isArray(data.assumptions)
        ? data.assumptions.filter((value: unknown): value is string => typeof value === "string")
        : undefined;

      const generationPayload: Record<string, unknown> = {
        projectId: projectId as any,
        status: "ready",
        source: typeof data.source === "string" ? data.source : "llm",
        usedFallback: Boolean(data.usedFallback),
      };
      if (typeof data.rationale === "string" && data.rationale.trim().length > 0) {
        generationPayload.rationale = data.rationale;
      }
      if (assumptions && assumptions.length > 0) {
        generationPayload.assumptions = assumptions;
      }
      await updateGenerationState(generationPayload as any);

      setSaved(true);
    } catch (error) {
      const selectedIds = Array.isArray(project.selectedComponentIds)
        ? project.selectedComponentIds.filter(
            (value: unknown): value is string => typeof value === "string"
          )
        : [];

      if (selectedIds.length > 0) {
        const fallback = buildGraphFromComponentIds(selectedIds);
        setNodes(fallback.nodes as any);
        setEdges(fallback.edges as any);
        await updateGraph({
          projectId: projectId as any,
          graph: {
            nodes: fallback.nodes as any,
            edges: fallback.edges as any,
          },
        });
        await updateGenerationState({
          projectId: projectId as any,
          status: "ready",
          source: "client_deterministic_scaffold",
          usedFallback: true,
          rationale:
            "Client deterministic scaffold was applied because server generation failed.",
          assumptions: ["Project was created from selected ideation components."],
        });
        setSaved(true);
      } else {
        const message =
          error instanceof Error ? error.message : "Architecture generation failed";
        setGenerationError(message);
        await updateGenerationState({
          projectId: projectId as any,
          status: "failed",
          error: message,
        });
      }
    } finally {
      setIsGeneratingArchitecture(false);
    }
  }, [
    projectId,
    project,
    constraints,
    setNodes,
    setEdges,
    updateGraph,
    updateGenerationState,
  ]);

  useEffect(() => {
    if (!projectId || !project || !hydrated) return;

    const hasPersistedGraph = (project.graph?.nodes?.length ?? 0) > 0;
    const status = (project.generationStatus ?? (hasPersistedGraph ? "ready" : "pending")) as GenerationStatus;
    const shouldGenerate =
      !hasPersistedGraph &&
      (status === "pending" || status === "generating" || status === "failed");

    if (!shouldGenerate) return;
    if (generationStartedForProjectRef.current === projectId) return;

    generationStartedForProjectRef.current = projectId;
    runArchitectureGeneration();
  }, [projectId, project, hydrated, runArchitectureGeneration]);

  const debouncedSaveGraph = useCallback(() => {
    if (!projectId || !hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setSaved(false);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateGraph({
          projectId: projectId as any,
          graph: { nodes: nodes as any, edges: edges as any },
        });
        setSaved(true);
      } catch {
        // save failed silently
      }
    }, 1500);
  }, [projectId, hydrated, nodes, edges, updateGraph]);

  useEffect(() => {
    if (hydrated) debouncedSaveGraph();
  }, [nodes, edges, hydrated, debouncedSaveGraph]);

  useEffect(() => {
    if (!hydrated || !projectId) return;

    if (!didHydrateConstraintsRef.current) {
      didHydrateConstraintsRef.current = true;
      return;
    }

    if (constraintsSaveTimerRef.current) clearTimeout(constraintsSaveTimerRef.current);

    constraintsSaveTimerRef.current = setTimeout(() => {
      updateConstraintsMutation({
        projectId: projectId as any,
        constraints: constraints as any,
      }).catch(() => {
        // best effort
      });
    }, 700);
  }, [constraints, hydrated, projectId, updateConstraintsMutation]);

  useEffect(() => {
    if (!hydrated) return;
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);

    analysisTimerRef.current = setTimeout(() => {
      const nextScores = scoreArchitecture(nodes as any[], edges as any[], constraints as any);
      const nextLintIssues = runLinter(nodes as any[], edges as any[], constraints as any);
      setScores(nextScores as any);
      setLintIssues(nextLintIssues as any);
    }, 120);

    return () => {
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    };
  }, [nodes, edges, constraints, hydrated, setScores, setLintIssues]);

  function handleNameBlur() {
    setEditingName(false);
    if (projectId && projectName.trim()) {
      updateMeta({ projectId: projectId as any, name: projectName.trim() });
    }
  }

  const displayConstraints = useMemo(
    () => [
      { label: `Traffic: ${constraints.trafficExpectation}`, icon: "📊" },
      { label: `Budget: ${constraints.budgetLevel}`, icon: "💰" },
      { label: `Timeline: ${constraints.timeline}`, icon: "⏱️" },
      { label: `Team: ${constraints.teamSize}`, icon: "👥" },
      { label: `Regions: ${constraints.regionCount}`, icon: "🌍" },
      { label: `Uptime: ${constraints.uptimeTarget}%`, icon: "📈" },
    ],
    [constraints]
  );

  if (project === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-primary)]">
        <p className="text-[var(--text-secondary)]">Project not found.</p>
        <Link href="/projects" className="text-[var(--accent)] hover:underline text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const projectStatus = (project.generationStatus ?? "ready") as GenerationStatus;
  const showGenerationModal =
    isGeneratingArchitecture ||
    ((projectStatus === "pending" || projectStatus === "generating") &&
      nodes.length === 0);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
        <header className="h-12 flex items-center gap-2 px-3 glass border-b border-[var(--border)] z-20 shrink-0">
          <Link
            href="/projects"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-xs">
            P
          </div>

          {editingName ? (
            <input
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
              className="text-sm font-semibold bg-transparent text-[var(--text-primary)] border-b border-[var(--accent)] outline-none px-1"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors px-1"
            >
              {projectName}
            </button>
          )}

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <button
            onClick={runArchitectureGeneration}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white hover:shadow-[var(--clay-glow)] transition-all disabled:opacity-60"
            disabled={isGeneratingArchitecture}
          >
            {isGeneratingArchitecture ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Regenerate
          </button>
          <button
            onClick={() => setRightTab("compare")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${rightTab === "compare" ? "bg-[var(--bg-hover)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare
          </button>
          <button
            onClick={() => setRightTab("lint")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${rightTab === "lint" ? "bg-[var(--bg-hover)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Lint
          </button>
          <button
            onClick={() => setRightTab("export")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${rightTab === "export" ? "bg-[var(--bg-hover)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
          >
            <FileOutput className="w-3.5 h-3.5" />
            Export
          </button>

          <div className="flex-1" />

          <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            {saved ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Loader2 className="w-3 h-3 animate-spin" />}
            {saved ? "Saved" : "Saving..."}
          </span>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-[280px] border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto shrink-0">
            <ComponentLibrary />
          </aside>

          <main className="flex-1 relative">
            <ArchitectureCanvas />
          </main>

          <aside className="w-[360px] border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto shrink-0">
            <RightSidebar
              activeTab={rightTab}
              onTabChange={setRightTab}
              projectId={projectId}
              sourceIdeationSnapshot={(project.sourceIdeationSnapshot as any) ?? []}
            />
          </aside>
        </div>

        <footer className="h-10 flex items-center gap-2 px-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] overflow-x-auto shrink-0">
          <span className="text-xs text-[var(--text-muted)] shrink-0">Constraints:</span>
          {displayConstraints.map((item) => (
            <button key={item.label} className="chip shrink-0">
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </footer>

        {showGenerationModal && (
          <div className="absolute inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Generating architecture
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Building connections and layout for your selected components.
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] animate-[pulse_1.4s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        )}

        {generationError && (
          <div className="absolute bottom-14 right-4 z-40 rounded-lg bg-red-500/15 border border-red-400/40 text-red-300 px-3 py-2 text-xs">
            {generationError}
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
