"use client";

import React, { useState } from "react";
import CostEstimatePanel from "../cost/CostEstimatePanel";
import SmartSuggestions from "../suggestions/SmartSuggestions";
import Chatbot from "../chat/Chatbot";
import ScoresPanel from "../workspace/panels/ScoresPanel";
import LintPanel from "../workspace/panels/LintPanel";
import ComparePanel from "../workspace/panels/ComparePanel";
import ExportPanel from "../workspace/panels/ExportPanel";
import { Radar, ShieldCheck, MessageSquare, DollarSign, Lightbulb, GitCompare, FileOutput } from "lucide-react";
import { cn } from "@/lib/utils";

export type RightSidebarTab = "scores" | "lint" | "compare" | "export" | "chat" | "cost" | "suggestions";

interface RightSidebarProps {
  activeTab?: RightSidebarTab;
  onTabChange?: (tab: RightSidebarTab) => void;
  projectId: string;
  sourceIdeationSnapshot?: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  }>;
}

export default function RightSidebar({
  activeTab: controlledTab,
  onTabChange,
  projectId,
  sourceIdeationSnapshot,
}: RightSidebarProps) {
  const [internalTab, setInternalTab] = useState<RightSidebarTab>("scores");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const tabs: { id: RightSidebarTab; label: string; icon: React.ElementType }[] = [
    { id: "scores", label: "Scores", icon: Radar },
    { id: "lint", label: "Lint", icon: ShieldCheck },
    { id: "compare", label: "Compare", icon: GitCompare },
    { id: "export", label: "Export", icon: FileOutput },
    { id: "chat", label: "AI", icon: MessageSquare },
    { id: "cost", label: "Cost", icon: DollarSign },
    { id: "suggestions", label: "Tips", icon: Lightbulb },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-1.5 py-2.5 text-[10px] font-medium transition-colors whitespace-nowrap min-w-0",
              activeTab === tab.id
                ? "bg-[var(--bg-primary)] text-[var(--accent)] border-b-2 border-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            )}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "scores" && <ScoresPanel />}
        {activeTab === "lint" && <LintPanel />}
        {activeTab === "compare" && <ComparePanel />}
        {activeTab === "export" && <ExportPanel />}
        {activeTab === "chat" && (
          <Chatbot
            projectId={projectId}
            sourceIdeationSnapshot={sourceIdeationSnapshot}
          />
        )}
        {activeTab === "cost" && <CostEstimatePanel />}
        {activeTab === "suggestions" && <SmartSuggestions />}
      </div>
    </div>
  );
}
