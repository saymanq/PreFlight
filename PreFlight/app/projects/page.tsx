"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    FolderOpen,
    Clock,
    Sparkles,
    LayoutGrid,
    Loader2,
    MessageSquare,
    Archive,
} from "lucide-react";

const TEMPLATES = [
    { name: "SaaS App", icon: "💼", prompt: "Build a SaaS application with user authentication, subscription billing, dashboard, and admin panel." },
    { name: "AI Chat App", icon: "🤖", prompt: "Build an AI chatbot application with conversation history, file uploads, and streaming responses." },
    { name: "Marketplace", icon: "🛒", prompt: "Build a marketplace with listings, search, user profiles, messaging, and payment processing." },
    { name: "Internal Tool", icon: "🔧", prompt: "Build an internal tool with role-based access, data tables, forms, and reporting." },
    { name: "Real-time App", icon: "⚡", prompt: "Build a real-time collaborative application with live updates, presence indicators, and notifications." },
    { name: "RAG App", icon: "📚", prompt: "Build a RAG (Retrieval Augmented Generation) application with document upload, vector search, and AI-powered Q&A." },
];

export default function DashboardPage() {
    const router = useRouter();
    const projects = useQuery(api.projects.listByOwner, { archived: false }) ?? [];
    const createProject = useMutation(api.projects.create);
    const archiveProject = useMutation(api.projects.archive);
    const getOrCreateUser = useMutation(api.users.getOrCreate);

    const [isCreating, setIsCreating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");

    // Ensure user exists in Convex
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

    const handleTemplateClick = (template: typeof TEMPLATES[0]) => {
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
        <div className="min-h-screen bg-background">
            {/* Top bar */}
            <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
                    <Link href="/" className="flex items-center gap-2 shrink-0" title="PreFlight">
                        <img
                            src="/preflight-logo.png"
                            alt="PreFlight"
                            className="h-11 w-auto object-contain"
                        />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Ideation Chat
                        </Link>
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-8 text-xs gap-1.5">
                                    <Plus className="h-3.5 w-3.5" />
                                    New Project
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Create New Project</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div>
                                        <label className="text-xs font-medium mb-1.5 block">Project Name</label>
                                        <Input
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="My Architecture"
                                            className="h-9"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1.5 block">Description (optional)</label>
                                        <Input
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            placeholder="Brief description of the app"
                                            className="h-9"
                                        />
                                    </div>
                                    <Button onClick={handleCreate} disabled={!newName.trim() || isCreating} className="w-full">
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Create Project
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <UserButton />
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Projects */}
                {activeProjects.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" /> Your Projects
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeProjects.map((project) => (
                                <Card
                                    key={project._id}
                                    className="cursor-pointer hover:border-primary/50 transition-all group"
                                    onClick={() => router.push(`/project/${project._id}`)}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                                    {project.name}
                                                </h3>
                                                {project.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {project.description}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(event) => handleArchive(String(project._id), event)}
                                                title="Archive project"
                                            >
                                                <Archive className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {project.graph?.nodes?.length ?? 0} nodes
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(project.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* Templates */}
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Quick Start Templates
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {TEMPLATES.map((template) => (
                            <Card
                                key={template.name}
                                className="cursor-pointer hover:border-primary/50 transition-all group text-center"
                                onClick={() => handleTemplateClick(template)}
                            >
                                <CardContent className="p-4">
                                    <span className="text-2xl">{template.icon}</span>
                                    <p className="text-xs font-medium mt-2 group-hover:text-primary transition-colors">
                                        {template.name}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Empty state */}
                {activeProjects.length === 0 && (
                    <div className="text-center py-16">
                        <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Create your first project or start from a template
                        </p>
                        <Button onClick={() => setIsOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Your First Project
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
