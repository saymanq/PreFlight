"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

const DIMENSION_INFO: Record<string, { label: string; color: string; icon: string }> = {
    buildSpeed: { label: "Build Speed", color: "#22c55e", icon: "🚀" },
    complexity: { label: "Complexity", color: "#f59e0b", icon: "🧩" },
    scalability: { label: "Scalability", color: "#3b82f6", icon: "📈" },
    opsBurden: { label: "Ops Burden", color: "#ef4444", icon: "⚙️" },
    cost: { label: "Est. Cost", color: "#a855f7", icon: "💰" },
    lockIn: { label: "Lock-in Risk", color: "#f97316", icon: "🔒" },
    reliability: { label: "Reliability", color: "#06b6d4", icon: "🛡️" },
    aiReadiness: { label: "AI Readiness", color: "#ec4899", icon: "🤖" },
};

interface ScorePanelProps {
    scores: Record<string, { score: number; explanation: string }> | null;
}

export function ScorePanel({ scores }: ScorePanelProps) {
    if (!scores || Object.keys(scores).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-sm">No scores yet</p>
                <p className="text-xs mt-1">Add components and click Lint to generate scores</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Architecture Scores</h3>
                <Badge variant="secondary" className="text-[10px]">
                    {Object.keys(scores).length} dimensions
                </Badge>
            </div>

            <div className="space-y-2">
                {Object.entries(scores).map(([key, { score, explanation }]) => {
                    const info = DIMENSION_INFO[key];
                    if (!info) return null;
                    const normalizedScore = Math.max(1, Math.min(10, score));
                    const percentage = (normalizedScore / 10) * 100;

                    return (
                        <div key={key} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm">{info.icon}</span>
                                    <span className="text-xs font-medium">{info.label}</span>
                                </div>
                                <span
                                    className="text-sm font-bold"
                                    style={{ color: info.color }}
                                >
                                    {normalizedScore}/10
                                </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: info.color,
                                    }}
                                />
                            </div>
                            {explanation && (
                                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                                    {explanation}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
