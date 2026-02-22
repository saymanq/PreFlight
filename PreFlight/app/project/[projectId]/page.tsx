"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ReactFlowProvider } from "@xyflow/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ArchitectureCanvas from "@/components/canvas/ArchitectureCanvas";
import ComponentLibrary from "@/components/sidebar/ComponentLibrary";
import RightSidebar, { type RightSidebarTab } from "@/components/sidebar/RightSidebar";
import { useArchitectureStore } from "@/lib/architecture-store";
import { scoreArchitecture } from "@/lib/scoring/score-engine";
import { runLinter } from "@/lib/linting/lint-engine";
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

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as any } : "skip"
  );
  const updateGraph = useMutation(api.projects.updateGraph);
  const updateMeta = useMutation(api.projects.updateMeta);

  const [projectName, setProjectName] = useState("Untitled Project");
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved] = useState(true);
  const [rightTab, setRightTab] = useState<RightSidebarTab>("scores");
  const [hydrated, setHydrated] = useState(false);

  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const setNodes = useArchitectureStore((s) => s.setNodes);
  const setEdges = useArchitectureStore((s) => s.setEdges);
  const setProjectNameInStore = useArchitectureStore((s) => s.setProjectName);
  const constraints = useArchitectureStore((s) => s.constraints);
  const setScores = useArchitectureStore((s) => s.setScores);
  const setLintIssues = useArchitectureStore((s) => s.setLintIssues);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialHydrationDone = useRef(false);

  useEffect(() => {
    if (project && !initialHydrationDone.current) {
      setProjectName(project.name);
      setProjectNameInStore(project.name);
      if (project.graph?.nodes?.length) setNodes(project.graph.nodes as any);
      if (project.graph?.edges?.length) setEdges(project.graph.edges as any);
      initialHydrationDone.current = true;
      setHydrated(true);
    }
  }, [project, setNodes, setEdges, setProjectNameInStore]);

  const debouncedSaveGraph = useCallback(() => {
    if (!projectId || !initialHydrationDone.current) return;
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
  }, [projectId, nodes, edges, updateGraph]);

  useEffect(() => {
    if (hydrated) debouncedSaveGraph();
  }, [nodes, edges, hydrated, debouncedSaveGraph]);

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

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
        {/* Top Toolbar */}
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

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white hover:shadow-[var(--clay-glow)] transition-all">
            <Sparkles className="w-3.5 h-3.5" />
            Generate
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

        {/* Main Content: Left Sidebar | Canvas | Right Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-[280px] border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto shrink-0">
            <ComponentLibrary />
          </aside>

          {/* Center Canvas */}
          <main className="flex-1 relative">
            <ArchitectureCanvas />
          </main>

          {/* Right Panel */}
          <aside className="w-[360px] border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto shrink-0">
            <RightSidebar
              activeTab={rightTab}
              onTabChange={setRightTab}
              projectId={projectId}
              sourceIdeationSnapshot={(project.sourceIdeationSnapshot as any) ?? []}
            />
          </aside>
        </div>

        {/* Bottom Constraints Bar */}
        <footer className="h-10 flex items-center gap-2 px-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] overflow-x-auto shrink-0">
          <span className="text-xs text-[var(--text-muted)] shrink-0">Constraints:</span>
          {[
            { label: `Users: ${project.constraints?.teamSize ?? 1}K`, icon: "👥" },
            { label: `Traffic: ${project.constraints?.trafficExpectation ?? "Medium"}`, icon: "📊" },
            { label: `Budget: ${project.constraints?.budgetLevel ?? "Medium"}`, icon: "💰" },
            { label: `Timeline: ${project.constraints?.timeline ?? "1month"}`, icon: "⏱️" },
            { label: `Team: ${project.constraints?.teamSize ?? 2}`, icon: "👥" },
            { label: `Regions: ${project.constraints?.regionCount ?? 1}`, icon: "🌍" },
            { label: `Uptime: ${project.constraints?.uptimeTarget ?? 99}%`, icon: "📈" },
            { label: `Priority: MVP Speed`, icon: "🎯" },
          ].map((c) => (
            <button key={c.label} className="chip shrink-0">
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </footer>
      </div>
    </ReactFlowProvider>
  );
}
