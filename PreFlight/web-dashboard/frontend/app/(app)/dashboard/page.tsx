"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Plus,
  Layers,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Copy,
  FolderOpen,
  MessageSquare,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const projects = useQuery(api.projects.list, { archived: false });
  const createProject = useMutation(api.projects.create);
  const loading = projects === undefined;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIdeaPrompt, setNewIdeaPrompt] = useState("");
  const [startFrom, setStartFrom] = useState<"blank" | "ai">("blank");

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const projectId = await createProject({
        name: newName,
        description: newDescription || undefined,
        ideaPrompt: newIdeaPrompt || undefined,
      });
      router.push(`/project/${projectId}`);
    } catch {
      router.push("/sandbox/new");
    }
    setShowCreateModal(false);
  }

  function getScoreColor(score?: number) {
    if (!score) return "var(--text-muted)";
    if (score >= 8) return "var(--score-excellent)";
    if (score >= 6) return "var(--score-good)";
    if (score >= 4) return "var(--score-moderate)";
    return "var(--score-poor)";
  }

  const templates = [
    { id: "saas", name: "SaaS App", desc: "Next.js + Backend + DB + Auth" },
    { id: "rag", name: "AI Chat / RAG", desc: "Frontend + LLM + Vector DB" },
    { id: "marketplace", name: "Marketplace", desc: "Full-stack with payments" },
    { id: "realtime", name: "Realtime App", desc: "WebSockets + Cache + DB" },
    { id: "internal", name: "Internal Tool", desc: "Admin dashboard + API" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-10 glass px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Preflight</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/plan"
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] font-medium text-sm hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Preflight Chat
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--text-inverse)] font-medium text-sm hover:bg-[var(--accent-hover)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Projects */}
          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Your Projects</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="clay h-48 animate-pulse" />
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map((p) => (
                  <Link key={p._id} href={`/project/${p._id}`} className="clay-interactive p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate pr-2">{p.name}</h3>
                      <button className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    {p.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2">{p.description}</p>
                    )}
                    {typeof p.overallScore === "number" && (
                      <div className="flex items-center gap-2">
                        <div className="score-bar flex-1">
                          <div
                            className="score-bar-fill"
                            data-level={p.overallScore >= 8 ? "excellent" : p.overallScore >= 6 ? "good" : p.overallScore >= 4 ? "moderate" : "poor"}
                            style={{ width: `${(p.overallScore / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: getScoreColor(p.overallScore) }}>
                          {p.overallScore.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {p.nodeCount} nodes
                      </span>
                      {(p.lintErrorCount > 0 || p.lintWarningCount > 0) && (
                        <span className="flex items-center gap-1 text-[var(--warning)]">
                          <AlertTriangle className="w-3 h-3" />
                          {p.lintErrorCount + p.lintWarningCount} issues
                        </span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {new Date(p._creationTime).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="clay p-12 text-center space-y-4">
                <FolderOpen className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
                <p className="text-[var(--text-secondary)]">No projects yet. Create your first architecture.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--text-inverse)] font-medium hover:bg-[var(--accent-hover)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
                <p className="text-xs text-[var(--text-muted)]">
                  <Link href="/plan" className="text-[var(--accent)] hover:underline font-medium">
                    Plan with Preflight Chat
                  </Link>
                  {" "}(chats are saved) or jump into the{" "}
                  <Link href="/sandbox/new" className="text-[var(--accent)] hover:underline">
                    quick sandbox
                  </Link>
                </p>
              </div>
            )}
          </section>

          {/* Templates */}
          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Start from Template</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setNewName(t.name);
                    setStartFrom("ai");
                    setNewIdeaPrompt(t.desc);
                    setShowCreateModal(true);
                  }}
                  className="clay-interactive p-4 text-left space-y-1"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]">{t.name}</span>
                  <span className="text-xs text-[var(--text-muted)] block">{t.desc}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="clay-lg w-full max-w-lg p-6 space-y-5 animate-fadeIn">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Project</h2>

            <div className="space-y-3">
              <label className="block text-sm text-[var(--text-secondary)]">Project Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Architecture"
                className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-[var(--text-secondary)]">Describe your app idea</label>
              <textarea
                value={newIdeaPrompt}
                onChange={(e) => setNewIdeaPrompt(e.target.value)}
                rows={3}
                placeholder="AI note-taking app with file uploads, real-time collaboration, and search..."
                className="w-full px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-[var(--text-secondary)]">Start from</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setStartFrom("blank")}
                  className={`flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all ${
                    startFrom === "blank"
                      ? "bg-[var(--accent-muted)] border border-[var(--accent)] text-[var(--accent)]"
                      : "bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  Blank Canvas
                </button>
                <button
                  onClick={() => setStartFrom("ai")}
                  className={`flex-1 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    startFrom === "ai"
                      ? "bg-[var(--accent-muted)] border border-[var(--accent)] text-[var(--accent)]"
                      : "bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI-Generated
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-[var(--radius-sm)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-6 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--text-inverse)] font-medium text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create & Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
