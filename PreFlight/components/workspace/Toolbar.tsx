"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/lib/store";
import {
    Sparkles,
    GitCompare,
    AlertTriangle,
    Download,
    Undo2,
    Redo2,
    Save,
    Loader2,
} from "lucide-react";

interface ToolbarProps {
    projectName: string;
    onGenerate: () => void;
    onCompare: () => void;
    onLint: () => void;
    onExport: () => void;
}

export function Toolbar({
    projectName,
    onGenerate,
    onCompare,
    onLint,
    onExport,
}: ToolbarProps) {
    const { isDirty, isSaving, isGenerating } = useWorkspaceStore();

    return (
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
                <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                    {projectName}
                </h1>
                {isSaving && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving
                    </Badge>
                )}
                {isDirty && !isSaving && (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Unsaved
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                <Button
                    size="sm"
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
                >
                    {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onCompare}
                    className="h-8 text-xs gap-1.5"
                >
                    <GitCompare className="h-3.5 w-3.5" />
                    Compare
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onLint}
                    className="h-8 text-xs gap-1.5"
                >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Lint
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                    className="h-8 text-xs gap-1.5"
                >
                    <Download className="h-3.5 w-3.5" />
                    Export
                </Button>
            </div>
        </div>
    );
}
