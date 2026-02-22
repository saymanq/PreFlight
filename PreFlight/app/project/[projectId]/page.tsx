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
  FileOutput,
  Check,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
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
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

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
        {/* Top Toolbar */}
        <header className="h-12 flex items-center gap-2 px-3 glass gradient-border-b z-20 shrink-0">
          <Link
            href="/"
            className="flex items-center shrink-0"
            title="PreFlight"
          >
            <img
              src="/preflight-logo.png"
              alt="PreFlight"
              className="h-11 w-auto object-contain"
            />
          </Link>

          <Link
            href="/projects"
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

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

          <div className="flex-1" />

          <button
            onClick={() => setRightTab("export")}
            className="group relative inline-flex items-center justify-center gap-1.5 px-6 py-2 overflow-hidden tracking-tighter text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-md"
          >
            <span className="absolute left-1/2 top-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out rounded-full bg-[var(--accent)] group-hover:w-56 group-hover:h-56" />
            <span className="absolute bottom-0 left-0 h-full -ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-auto h-full opacity-100 object-stretch" viewBox="0 0 487 487">
                <path fillOpacity=".1" fillRule="nonzero" fill="#FFF" d="M0 .3c67 2.1 134.1 4.3 186.3 37 52.2 32.7 89.6 95.8 112.8 150.6 23.2 54.8 32.3 101.4 61.2 149.9 28.9 48.4 77.7 98.8 126.4 149.2H0V.3z" />
              </svg>
            </span>
            <span className="absolute top-0 right-0 w-12 h-full -mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="object-cover w-full h-full" viewBox="0 0 487 487">
                <path fillOpacity=".1" fillRule="nonzero" fill="#FFF" d="M487 486.7c-66.1-3.6-132.3-7.3-186.3-37s-95.9-85.3-126.2-137.2c-30.4-51.8-49.3-99.9-76.5-151.4C70.9 109.6 35.6 54.8.3 0H487v486.7z" />
              </svg>
            </span>
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-white/20" />
            <span className="relative flex items-center gap-1.5 text-xs font-semibold">
              <FileOutput className="w-3.5 h-3.5" />
              Export
            </span>
          </button>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            {saved ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Loader2 className="w-3 h-3 animate-spin" />}
            {saved ? "Saved" : "Saving..."}
          </span>
        </header>

        {/* Main Content: Left Sidebar | Canvas | Right Panel */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Sidebar — collapsible */}
          <aside
            className="border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto overflow-x-hidden shrink-0 transition-[width] duration-300 ease-in-out"
            style={{ width: leftSidebarOpen ? 280 : 0 }}
          >
            <div className="w-[280px]">
              <ComponentLibrary />
            </div>
          </aside>

          {/* Sidebar toggle tab */}
          <button
            onClick={() => setLeftSidebarOpen((v) => !v)}
            className="absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-5 h-10 rounded-r-md bg-[var(--bg-surface)] border border-l-0 border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-300 ease-in-out"
            style={{ left: leftSidebarOpen ? 280 : 0 }}
            title={leftSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {leftSidebarOpen ? <PanelLeftClose className="w-3 h-3" /> : <PanelLeftOpen className="w-3 h-3" />}
          </button>

          {/* Center Canvas */}
          <main className="flex-1 relative">
            <ArchitectureCanvas />
          </main>

          {/* Right sidebar toggle tab */}
          <button
            onClick={() => setRightSidebarOpen((v) => !v)}
            className="absolute top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-5 h-10 rounded-l-md bg-[var(--bg-surface)] border border-r-0 border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all duration-300 ease-in-out"
            style={{ right: rightSidebarOpen ? 360 : 0 }}
            title={rightSidebarOpen ? "Collapse panel" : "Expand panel"}
          >
            {rightSidebarOpen ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
          </button>

          {/* Right Panel — collapsible */}
          <aside
            className="border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto overflow-x-hidden shrink-0 transition-[width] duration-300 ease-in-out"
            style={{ width: rightSidebarOpen ? 360 : 0 }}
          >
            <div className="w-[360px]">
              <RightSidebar
                activeTab={rightTab}
                onTabChange={setRightTab}
                projectId={projectId}
                sourceIdeationSnapshot={(project.sourceIdeationSnapshot as any) ?? []}
              />
            </div>
          </aside>
        </div>

        {/* Bottom Constraints Bar */}
        <footer className="h-10 flex items-center gap-2 px-4 bg-[var(--bg-secondary)] border-t border-[var(--border)] overflow-x-auto shrink-0">
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
