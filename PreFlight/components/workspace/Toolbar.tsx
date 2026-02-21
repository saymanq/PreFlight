"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/lib/store";
import {
    GitCompare,
    AlertTriangle,
    Download,
    Loader2,
    ChevronRight,
} from "lucide-react";

interface ToolbarProps {
    projectName: string;
    onRenameProject: (name: string) => Promise<void>;
    onCompare: () => void;
    onLint: () => void;
    onExport: () => void;
}

export function Toolbar({
    projectName,
    onRenameProject,
    onCompare,
    onLint,
    onExport,
}: ToolbarProps) {
    const { isDirty, isSaving } = useWorkspaceStore();
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [nameDraft, setNameDraft] = React.useState(projectName);
    const [isRenaming, setIsRenaming] = React.useState(false);

    React.useEffect(() => {
        if (!isEditingName) {
            setNameDraft(projectName);
        }
    }, [projectName, isEditingName]);

    const commitRename = React.useCallback(async () => {
        const nextName = nameDraft.trim();
        setIsEditingName(false);

        if (!nextName || nextName === projectName) {
            setNameDraft(projectName);
            return;
        }

        setIsRenaming(true);
        try {
            await onRenameProject(nextName);
        } catch (err) {
            console.error("Rename failed:", err);
            setNameDraft(projectName);
        } finally {
            setIsRenaming(false);
        }
    }, [nameDraft, onRenameProject, projectName]);

    return (
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4">
            <div className="flex items-center gap-2 min-w-0">
                <Link
                    href="/dashboard"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Dashboard
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {isEditingName ? (
                    <Input
                        value={nameDraft}
                        autoFocus
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                            } else if (e.key === "Escape") {
                                e.preventDefault();
                                setNameDraft(projectName);
                                setIsEditingName(false);
                            }
                        }}
                        className="h-7 w-[220px] text-sm"
                    />
                ) : (
                    <button
                        type="button"
                        className="text-sm font-semibold text-foreground truncate max-w-[220px] text-left hover:text-primary transition-colors"
                        onClick={() => setIsEditingName(true)}
                        disabled={isRenaming}
                        title="Click to rename project"
                    >
                        {projectName}
                    </button>
                )}
                {isRenaming && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                )}
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
