"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FolderOpen,
  Clock,
  Sparkles,
  Loader2,
  MessageSquare,
  Archive,
  ArrowRight,
  Layers,
} from "lucide-react";

const TEMPLATES = [
  {
    name: "SaaS App",
    icon: "\uD83D\uDCBC",
    prompt:
      "Build a SaaS application with user authentication, subscription billing, dashboard, and admin panel.",
  },
  {
    name: "AI Chat App",
    icon: "\uD83E\uDD16",
    prompt:
      "Build an AI chatbot application with conversation history, file uploads, and streaming responses.",
  },
  {
    name: "Marketplace",
    icon: "\uD83D\uDED2",
    prompt:
      "Build a marketplace with listings, search, user profiles, messaging, and payment processing.",
  },
  {
    name: "Internal Tool",
    icon: "\uD83D\uDD27",
    prompt:
      "Build an internal tool with role-based access, data tables, forms, and reporting.",
  },
  {
    name: "Real-time App",
    icon: "\u26A1",
    prompt:
      "Build a real-time collaborative application with live updates, presence indicators, and notifications.",
  },
  {
    name: "RAG App",
    icon: "\uD83D\uDCDA",
    prompt:
      "Build a RAG (Retrieval Augmented Generation) application with document upload, vector search, and AI-powered Q&A.",
  },
];

function SkeletonCard() {
  return (
    <div className="rounded-xl p-5 border border-slate-400/[0.06] bg-white/[0.015] animate-pulse">
      <div className="h-4 w-2/3 rounded-md bg-white/[0.04] mb-3" />
      <div className="h-3 w-full rounded-md bg-white/[0.03] mb-2" />
      <div className="h-3 w-1/2 rounded-md bg-white/[0.03]" />
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.04]">
        <div className="h-4 w-16 rounded-md bg-white/[0.04]" />
        <div className="h-3 w-20 rounded-md bg-white/[0.03]" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const projectsRaw = useQuery(api.projects.listByOwner, { archived: false });
  const isLoading = projectsRaw === undefined;
  const projects = projectsRaw ?? [];
  const createProject = useMutation(api.projects.create);
  const archiveProject = useMutation(api.projects.archive);
  const getOrCreateUser = useMutation(api.users.getOrCreate);

  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    getOrCreateUser().catch(console.error);
  }, [getOrCreateUser]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const projectId = await createProject({
        name: newName,
        description: newDescription || undefined,
      });
      setIsOpen(false);
      setNewName("");
      setNewDescription("");
      router.push(`/project/${projectId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateBlank = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const projectId = await createProject({
        name: "Untitled Project",
      });
      router.push(`/project/${projectId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateClick = (template: (typeof TEMPLATES)[0]) => {
    setNewName(template.name);
    setNewDescription(template.prompt);
    setIsOpen(true);
  };

  const handleArchive = async (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await archiveProject({ projectId: projectId as any });
    } catch (err) {
      console.error(err);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeProjects = (projects as any[]).filter((p) => !p.archived);

  return (
    <div className="min-h-screen relative" style={{ background: "#06080D" }}>
      {/* Ambient gradient mesh */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[160px] opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.02]"
          style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(6, 8, 13, 0.6) 100%)" }}
        />
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Instrument+Serif:ital@0;1&display=swap"
        rel="stylesheet"
      />

      {/* ─── Header ─── */}
      <header
        className="sticky top-0 z-50 border-b border-white/[0.04] backdrop-blur-xl"
        style={{ background: "rgba(8, 9, 14, 0.8)" }}
      >
        <div
          className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <Link href="/" className="flex items-center gap-2.5 shrink-0" title="PreFlight">
            <img src="/preflight-logo.png" alt="PreFlight" className="h-5 w-auto object-contain" />
            <span className="text-sm font-semibold tracking-wide text-slate-200">
              Preflight
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-200 hover:bg-white/[0.04] transition-all duration-200"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Dashboard
            </Link>

            <button
              type="button"
              onClick={handleCreateBlank}
              disabled={isCreating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_16px_rgba(16,185,129,0.15)]"
            >
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              New Project
            </button>

            {/* Dialog for template-based creation */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="sm:max-w-md border-white/[0.06]" style={{ background: "#0E1118" }}>
                <DialogHeader>
                  <DialogTitle className="text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Create from Template
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block text-slate-400">
                      Project Name
                    </label>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="My Architecture"
                      className="w-full h-9 px-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.06] text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block text-slate-400">
                      Description (optional)
                    </label>
                    <input
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Brief description of the app"
                      className="w-full h-9 px-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.06] text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || isCreating}
                    className="w-full h-9 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Create Project
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="ml-1">
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main
        className="relative z-10 max-w-6xl mx-auto px-6 py-10"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ─── Projects grid ─── */}
        {(isLoading || activeProjects.length > 0) && (
          <section className="mb-14" style={{ animation: "plan-fade-up 0.6s ease both" }}>
            <div className="flex items-center gap-2 mb-6">
              <FolderOpen className="h-4 w-4 text-slate-500" />
              <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest">
                Your Projects
              </h2>
              {!isLoading && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-500 ml-1">
                  {activeProjects.length}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProjects.map((project, i) => (
                <button
                  key={project._id}
                  type="button"
                  onClick={() => router.push(`/project/${project._id}`)}
                  className="group relative w-full text-left rounded-xl p-5 border border-slate-400/[0.06] bg-white/[0.015] hover:bg-white/[0.035] hover:border-slate-400/[0.12] transition-all duration-200"
                  style={{ animation: `plan-fade-up 0.5s ease ${0.05 + i * 0.04}s both` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-emerald-400 transition-colors duration-200">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div
                      onClick={(event) => handleArchive(String(project._id), event)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleArchive(String(project._id), e as any);
                      }}
                      role="button"
                      tabIndex={0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200 shrink-0"
                      title="Archive project"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.04]">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/[0.08] border border-emerald-500/[0.1] text-emerald-400 flex items-center gap-1">
                      <Layers className="h-2.5 w-2.5" />
                      {project.graph?.nodes?.length ?? 0} nodes
                    </span>
                    <span className="text-[11px] text-slate-600 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Hover arrow indicator */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                    <ArrowRight className="w-4 h-4 text-emerald-400/50" />
                  </div>
                </button>
              ))}
            </div>
            )}
          </section>
        )}

        {/* ─── Templates ─── */}
        <section style={{ animation: "plan-fade-up 0.6s ease 0.1s both" }}>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-4 w-4 text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-widest">
              Quick Start Templates
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TEMPLATES.map((template, i) => (
              <button
                key={template.name}
                type="button"
                onClick={() => handleTemplateClick(template)}
                className="group relative text-center rounded-xl p-4 border border-slate-400/[0.06] bg-white/[0.015] hover:bg-emerald-500/[0.04] hover:border-emerald-500/15 transition-all duration-200"
                style={{ animation: `plan-fade-up 0.5s ease ${0.15 + i * 0.04}s both` }}
              >
                <span className="text-2xl block">{template.icon}</span>
                <p className="text-xs font-medium mt-2.5 text-slate-400 group-hover:text-slate-200 transition-colors duration-200">
                  {template.name}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Empty state ─── */}
        {!isLoading && activeProjects.length === 0 && (
          <div
            className="text-center py-20 relative"
            style={{ animation: "plan-fade-up 0.7s ease 0.2s both" }}
          >
            {/* Glow behind empty state */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-full blur-[100px]"
                style={{
                  background: "radial-gradient(circle, rgba(16, 185, 129, 0.04) 0%, transparent 65%)",
                }}
              />
            </div>

            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                <FolderOpen className="h-7 w-7 text-slate-600" />
              </div>
              <h3
                className="text-xl font-medium text-slate-300 mb-2"
                style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}
              >
                No projects yet
              </h3>
              <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">
                Create your first project or start from a template above
              </p>
              <button
                type="button"
                onClick={handleCreateBlank}
                disabled={isCreating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-200 shadow-[0_0_24px_rgba(16,185,129,0.15)] hover:shadow-[0_0_32px_rgba(16,185,129,0.25)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)" }}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Your First Project
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
