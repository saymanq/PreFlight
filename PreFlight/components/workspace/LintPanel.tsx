"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/store";
import { AlertCircle, AlertTriangle, Info, ChevronRight } from "lucide-react";

interface LintIssue {
    code: string;
    severity: string;
    title: string;
    description: string;
    targets: string[];
    suggestedFix: string;
}

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    error: { icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    warning: { icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    info: { icon: Info, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
};

interface LintPanelProps {
    issues: LintIssue[] | null;
}

export function LintPanel({ issues }: LintPanelProps) {
    const { setSelectedNodeId, setRightPanelTab } = useWorkspaceStore();

    if (!issues || issues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p className="text-3xl mb-3">✅</p>
                <p className="text-sm">No issues found</p>
                <p className="text-xs mt-1">Add components and click Lint to check</p>
            </div>
        );
    }

    const grouped = {
        error: issues.filter((i) => i.severity === "error"),
        warning: issues.filter((i) => i.severity === "warning"),
        info: issues.filter((i) => i.severity === "info"),
    };

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Architecture Lint</h3>
                <div className="flex gap-1.5">
                    {grouped.error.length > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                            {grouped.error.length} errors
                        </Badge>
                    )}
                    {grouped.warning.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] text-amber-500">
                            {grouped.warning.length} warnings
                        </Badge>
                    )}
                    {grouped.info.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                            {grouped.info.length} info
                        </Badge>
                    )}
                </div>
            </div>

            {(["error", "warning", "info"] as const).map((severity) => {
                const items = grouped[severity];
                if (items.length === 0) return null;
                const config = SEVERITY_CONFIG[severity];
                const Icon = config.icon;

                return (
                    <div key={severity} className="space-y-1.5">
                        {items.map((issue, i) => (
                            <div
                                key={`${issue.code}-${i}`}
                                className="p-3 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
                                style={{ backgroundColor: config.bg }}
                                onClick={() => {
                                    if (issue.targets.length > 0) {
                                        setSelectedNodeId(issue.targets[0]);
                                        setRightPanelTab("inspector");
                                    }
                                }}
                            >
                                <div className="flex items-start gap-2">
                                    <Icon size={14} style={{ color: config.color }} className="mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium">{issue.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {issue.description}
                                        </p>
                                        {issue.suggestedFix && (
                                            <p className="text-[10px] text-primary mt-1">
                                                💡 {issue.suggestedFix}
                                            </p>
                                        )}
                                    </div>
                                    {issue.targets.length > 0 && (
                                        <ChevronRight size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
