import { StateCreator } from "zustand";

export interface LintTarget {
  nodeIds: string[];
  edgeIds?: string[];
  message: string;
}

export interface LintIssue {
  ruleId: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  category: string;
  targets: LintTarget;
  suggestedFix?: string;
  autoFixable: boolean;
}

export interface LintSlice {
  lintIssues: LintIssue[];
  setLintIssues: (issues: LintIssue[]) => void;
  clearLintIssues: () => void;
  errorCount: () => number;
  warningCount: () => number;
  infoCount: () => number;
}

export const createLintSlice: StateCreator<LintSlice, [], [], LintSlice> = (set, get) => ({
  lintIssues: [],
  setLintIssues: (issues) => set({ lintIssues: issues }),
  clearLintIssues: () => set({ lintIssues: [] }),
  errorCount: () => get().lintIssues.filter((i) => i.severity === "error").length,
  warningCount: () => get().lintIssues.filter((i) => i.severity === "warning").length,
  infoCount: () => get().lintIssues.filter((i) => i.severity === "info").length,
});
