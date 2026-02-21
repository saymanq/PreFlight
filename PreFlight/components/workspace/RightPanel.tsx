"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaceStore } from "@/lib/store";
import { InspectorPanel } from "./InspectorPanel";
import { ScorePanel } from "./ScorePanel";
import { LintPanel } from "./LintPanel";
import { AssistantPanel } from "./AssistantPanel";

interface RightPanelProps {
    projectId: string;
    priorIdeaMessages: Array<{
        role: "user" | "assistant";
        content: string;
        createdAt: number;
    }>;
    constraints: Record<string, string>;
    scores: Record<string, { score: number; explanation: string }> | null;
    lintIssues: Array<{
        code: string;
        severity: string;
        title: string;
        description: string;
        targets: string[];
        suggestedFix: string;
    }> | null;
}

export function RightPanel({
    projectId,
    priorIdeaMessages,
    constraints,
    scores,
    lintIssues,
}: RightPanelProps) {
    const { rightPanelTab, setRightPanelTab } = useWorkspaceStore();
    const [queuedAssistantPrompt, setQueuedAssistantPrompt] = React.useState<{
        id: number;
        prompt: string;
    } | null>(null);

    const handleFixWithAssistant = React.useCallback(
        (issue: {
            code: string;
            severity: string;
            title: string;
            description: string;
            targets: string[];
            suggestedFix: string;
        }) => {
            const targetsLine =
                issue.targets.length > 0
                    ? `Affected components (node IDs): ${issue.targets.join(", ")}.`
                    : "Affected components: not specified.";

            const suggestedFixLine = issue.suggestedFix
                ? `Suggested fix from lint: ${issue.suggestedFix}.`
                : "No explicit suggested fix was provided by lint.";

            const prompt = [
                "Please fix this lint issue directly on the canvas.",
                `Severity: ${issue.severity}.`,
                `Code: ${issue.code}.`,
                `Title: ${issue.title}.`,
                `Details: ${issue.description}.`,
                targetsLine,
                suggestedFixLine,
                "Apply the minimum architecture changes needed, then summarize what you changed.",
            ].join(" ");

            setQueuedAssistantPrompt({
                id: Date.now(),
                prompt,
            });
            setRightPanelTab("assistant");
        },
        [setRightPanelTab]
    );

    return (
        <div className="w-[340px] border-l border-border bg-card/50 flex flex-col h-full">
            <Tabs
                value={rightPanelTab}
                onValueChange={(v) =>
                    setRightPanelTab(v as "inspector" | "scores" | "lint" | "assistant")
                }
                className="flex flex-col h-full"
            >
                <div className="px-3 pt-3 pb-2 border-b border-border">
                    <TabsList className="w-full grid grid-cols-4 h-8">
                        <TabsTrigger value="inspector" className="text-[10px]">
                            Inspector
                        </TabsTrigger>
                        <TabsTrigger value="scores" className="text-[10px]">
                            Scores
                        </TabsTrigger>
                        <TabsTrigger value="lint" className="text-[10px]">
                            Lint
                        </TabsTrigger>
                        <TabsTrigger value="assistant" className="text-[10px]">
                            Assistant
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="inspector" className="flex-1 mt-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <InspectorPanel />
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="scores" className="flex-1 mt-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <ScorePanel scores={scores} />
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="lint" className="flex-1 mt-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <LintPanel
                            issues={lintIssues}
                            onFixWithAssistant={handleFixWithAssistant}
                        />
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="assistant" className="flex-1 mt-0 overflow-hidden flex flex-col">
                    <AssistantPanel
                        projectId={projectId}
                        priorIdeaMessages={priorIdeaMessages}
                        constraints={constraints}
                        scores={scores}
                        lintIssues={lintIssues}
                        queuedPrompt={queuedAssistantPrompt}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
