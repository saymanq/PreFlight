"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceStore, type ArchNode, type ArchEdge } from "@/lib/store";
import {
    GitCompare,
    Clock,
    Layers,
    ArrowRight,
    Save,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Plus,
    Minus,
    Loader2,
} from "lucide-react";

interface CompareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
}

export function CompareModal({ open, onOpenChange, projectId }: CompareModalProps) {
    const versions = useQuery(api.projects.listVersions, {
        projectId: projectId as Id<"projects">,
    });
    const createSnapshot = useMutation(api.projects.createVersionSnapshot);
    const { nodes, edges, setNodes, setEdges } = useWorkspaceStore();
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveSnapshot = async () => {
        setIsSaving(true);
        try {
            await createSnapshot({ projectId: projectId as Id<"projects"> });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedVersions = [...(versions ?? [])].sort((a: any, b: any) => b.versionNumber - a.versionNumber);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selected = selectedVersion !== null ? sortedVersions.find((v: any) => v.versionNumber === selectedVersion) : null;

    // Compare current vs selected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedGraph = selected?.graph as { nodes: any[]; edges: any[] } | undefined;
    const currentNodeTypes = new Set(nodes.map((n) => n.data.type));
    const selectedNodeTypes = new Set((selectedGraph?.nodes ?? []).map((n: ArchNode) => n.data?.type));

    const added = nodes.filter((n) => !selectedNodeTypes.has(n.data.type));
    const removed = (selectedGraph?.nodes ?? []).filter(
        (n: ArchNode) => !currentNodeTypes.has(n.data?.type)
    );
    const unchanged = nodes.filter((n) => selectedNodeTypes.has(n.data.type));

    const handleRestore = () => {
        if (!selectedGraph) return;
        setNodes(selectedGraph.nodes as ArchNode[]);
        setEdges(selectedGraph.edges as ArchEdge[]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitCompare className="h-5 w-5 text-primary" />
                        Compare Architectures
                    </DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 h-[60vh]">
                    {/* Version list */}
                    <div className="w-48 border-r border-border pr-4 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-muted-foreground">Versions</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] gap-1"
                                onClick={handleSaveSnapshot}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                Save
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="space-y-1">
                                {/* Current version always shown */}
                                <div
                                    className={`p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${selectedVersion === null
                                            ? "bg-primary/10 border border-primary/30"
                                            : "hover:bg-accent/50"
                                        }`}
                                    onClick={() => setSelectedVersion(null)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Layers className="h-3 w-3 text-primary" />
                                        <span className="font-medium">Current</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {nodes.length} nodes · {edges.length} edges
                                    </p>
                                </div>

                                {sortedVersions.map((version: any) => (
                                    <div
                                        key={version._id}
                                        className={`p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${selectedVersion === version.versionNumber
                                                ? "bg-primary/10 border border-primary/30"
                                                : "hover:bg-accent/50"
                                            }`}
                                        onClick={() => setSelectedVersion(version.versionNumber)}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            <span className="font-medium">v{version.versionNumber}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {version.graph?.nodes?.length ?? 0} nodes ·{" "}
                                            {new Date(version.createdAt).toLocaleDateString()}
                                        </p>
                                        {version.generationMeta?.source && (
                                            <Badge variant="secondary" className="text-[8px] mt-1">
                                                {version.generationMeta.source}
                                            </Badge>
                                        )}
                                    </div>
                                ))}

                                {sortedVersions.length === 0 && (
                                    <div className="text-center py-6 text-[10px] text-muted-foreground">
                                        <p>No saved versions yet.</p>
                                        <p className="mt-1">Click Save to snapshot the current architecture.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Comparison view */}
                    <div className="flex-1 flex flex-col">
                        {selectedVersion === null ? (
                            <div className="flex-1 flex items-center justify-center text-center">
                                <div>
                                    <GitCompare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                                    <p className="text-sm font-medium">Select a version to compare</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Save snapshots and compare different architecture iterations
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ScrollArea className="flex-1">
                                <div className="space-y-4 pr-2">
                                    {/* Summary */}
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                                        <div className="text-center flex-1">
                                            <p className="text-lg font-bold">{selectedGraph?.nodes?.length ?? 0}</p>
                                            <p className="text-[10px] text-muted-foreground">v{selectedVersion} nodes</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <div className="text-center flex-1">
                                            <p className="text-lg font-bold">{nodes.length}</p>
                                            <p className="text-[10px] text-muted-foreground">Current nodes</p>
                                        </div>
                                    </div>

                                    {/* Changes */}
                                    {added.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-green-400 mb-1.5 flex items-center gap-1">
                                                <Plus className="h-3 w-3" /> Added ({added.length})
                                            </p>
                                            <div className="space-y-1">
                                                {added.map((n) => (
                                                    <div key={n.id} className="flex items-center gap-2 p-2 rounded-md bg-green-500/5 border border-green-500/20 text-xs">
                                                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                                                        <span>{n.data.label}</span>
                                                        <Badge variant="secondary" className="text-[8px] ml-auto">{n.data.category}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {removed.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-red-400 mb-1.5 flex items-center gap-1">
                                                <Minus className="h-3 w-3" /> Removed ({removed.length})
                                            </p>
                                            <div className="space-y-1">
                                                {removed.map((n: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/20 text-xs">
                                                        <XCircle className="h-3 w-3 text-red-400" />
                                                        <span>{n.data?.label ?? n.data?.type}</span>
                                                        <Badge variant="secondary" className="text-[8px] ml-auto">{n.data?.category}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {unchanged.length > 0 && (
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                                Unchanged ({unchanged.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {unchanged.map((n) => (
                                                    <Badge key={n.id} variant="secondary" className="text-[9px]">
                                                        {n.data.label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {added.length === 0 && removed.length === 0 && (
                                        <div className="text-center py-6">
                                            <CheckCircle2 className="h-8 w-8 mx-auto text-green-400/50 mb-2" />
                                            <p className="text-sm">No differences</p>
                                            <p className="text-xs text-muted-foreground">Architecture is identical to v{selectedVersion}</p>
                                        </div>
                                    )}

                                    <Separator />

                                    {/* Restore button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs gap-1.5"
                                        onClick={handleRestore}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Restore v{selectedVersion}
                                    </Button>
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
