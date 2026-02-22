"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { useArchitectureStore } from "@/lib/architecture-store";
import { runLinter, type LintIssue } from "@/lib/linting/lint-engine";
import { canAutoFix, applyAutoFix } from "@/lib/linting/lint-fixes";
import type { PendingFix } from "@/lib/architecture-store/slices/historySlice";
import FixProposal from "./FixProposal";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Focus,
  Wrench,
  Check,
  Sparkles,
  Zap,
  ArrowRight,
  History,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "error":
      return <AlertCircle className="w-3.5 h-3.5 text-[var(--error)]" />;
    case "warning":
      return <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />;
    default:
      return <Info className="w-3.5 h-3.5 text-[var(--info)]" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls = `severity-${severity}`;
  return (
    <span
      className={`${cls} text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full`}
    >
      {severity}
    </span>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LintPanel() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const constraints = useArchitectureStore((s) => s.constraints);
  const setLintIssues = useArchitectureStore((s) => s.setLintIssues);
  const onNodesChange = useArchitectureStore((s) => s.onNodesChange);
  const pendingFix = useArchitectureStore((s) => s.pendingFix);
  const stageFix = useArchitectureStore((s) => s.stageFix);
  const snapshots = useArchitectureStore((s) => s.snapshots);
  const restoreSnapshot = useArchitectureStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useArchitectureStore((s) => s.deleteSnapshot);
  const [fixedRules, setFixedRules] = useState<Set<string>>(new Set());
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const issues: LintIssue[] = useMemo(() => {
    return runLinter(nodes as any[], edges as any[], constraints);
  }, [nodes, edges, constraints]);

  const issuesRef = React.useRef(issues);
  useEffect(() => {
    if (issuesRef.current !== issues) {
      issuesRef.current = issues;
      queueMicrotask(() => setLintIssues(issues));
      setFixedRules(new Set());
    }
  }, [issues, setLintIssues]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  const handleFocus = useCallback(
    (issue: LintIssue) => {
      const targetIds = issue.targets.nodeIds;
      if (targetIds.length === 0) return;
      const store = useArchitectureStore.getState();
      const changes = store.nodes.map((node) => ({
        id: node.id,
        type: "select" as const,
        selected: targetIds.includes(node.id),
      }));
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  function handleFix(issue: LintIssue) {
    const result = applyAutoFix(issue, nodes as any[], edges as any[]);
    if (!result) return;
    const pending: PendingFix = {
      issue,
      label: issue.title,
      previewNodes: result.nodes,
      previewEdges: result.edges,
      message: result.message,
      addedNodeIds: result.addedNodeIds,
      addedEdgeIds: result.addedEdgeIds,
      removedEdgeIds: result.removedEdgeIds,
    };
    stageFix(pending);
  }

  function handleFixAll() {
    let currentNodes = [...(nodes as any[])];
    let currentEdges = [...(edges as any[])];
    const allAddedNodeIds: string[] = [];
    const allAddedEdgeIds: string[] = [];
    const allRemovedEdgeIds: string[] = [];
    const messages: string[] = [];

    for (const issue of issues) {
      if (!canAutoFix(issue) || fixedRules.has(issue.ruleId)) continue;
      const result = applyAutoFix(issue, currentNodes, currentEdges);
      if (result) {
        currentNodes = result.nodes;
        currentEdges = result.edges;
        allAddedNodeIds.push(...result.addedNodeIds);
        allAddedEdgeIds.push(...result.addedEdgeIds);
        allRemovedEdgeIds.push(...result.removedEdgeIds);
        messages.push(result.message);
      }
    }

    if (messages.length === 0) return;

    const pending: PendingFix = {
      issue: null,
      label: `Fix all (${messages.length} issues)`,
      previewNodes: currentNodes,
      previewEdges: currentEdges,
      message: messages.join(". "),
      addedNodeIds: allAddedNodeIds,
      addedEdgeIds: allAddedEdgeIds,
      removedEdgeIds: allRemovedEdgeIds,
    };
    stageFix(pending);
  }

  const hasPending = pendingFix !== null;

  const fixableCount = issues.filter(
    (i) => canAutoFix(i) && !fixedRules.has(i.ruleId)
  ).length;

  return (
    <div className="relative h-full">
      {/* Proposal overlay — covers the panel when active */}
      {hasPending && <FixProposal />}

      <div
        className={`p-4 space-y-4 overflow-y-auto max-h-full ${hasPending ? "pointer-events-none opacity-20" : ""}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold gradient-text uppercase tracking-wider">
            Architecture Lint
          </h3>
          {fixableCount > 0 && (
            <button
              onClick={handleFixAll}
              disabled={hasPending}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[var(--success)] bg-[var(--success)]/10 hover:bg-[var(--success)]/20 transition-colors disabled:opacity-40"
            >
              <Sparkles className="w-3 h-3" />
              Fix all ({fixableCount})
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="flex items-center gap-3 text-xs">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-[var(--error)]">
              <AlertCircle className="w-3 h-3" /> {errorCount} error
              {errorCount > 1 ? "s" : ""}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 text-[var(--warning)]">
              <AlertTriangle className="w-3 h-3" /> {warnCount} warning
              {warnCount > 1 ? "s" : ""}
            </span>
          )}
          {infoCount > 0 && (
            <span className="flex items-center gap-1 text-[var(--info)]">
              <Info className="w-3 h-3" /> {infoCount} info
            </span>
          )}
          {issues.length === 0 && (
            <span className="text-[var(--success)] flex items-center gap-1">
              <Check className="w-3 h-3" /> No issues found
            </span>
          )}
        </div>

        {/* Issues List */}
        <div className="space-y-2">
          {issues.map((issue, idx) => {
            const fixable = canAutoFix(issue);
            const alreadyFixed = fixedRules.has(issue.ruleId);
            const isExpanded =
              expandedIssue === `${issue.ruleId}-${idx}`;

            return (
              <div
                key={`${issue.ruleId}-${idx}`}
                className={`clay-sm p-3 space-y-2 transition-all duration-300 ${
                  alreadyFixed ? "opacity-40 scale-[0.98]" : ""
                }`}
              >
                <div
                  className="flex items-start gap-2 cursor-pointer"
                  onClick={() =>
                    setExpandedIssue(
                      isExpanded ? null : `${issue.ruleId}-${idx}`
                    )
                  }
                >
                  <SeverityIcon severity={issue.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {issue.title}
                      </span>
                      <SeverityBadge severity={issue.severity} />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      {issue.description}
                    </p>
                  </div>
                </div>

                {issue.suggestedFix && (
                  <div className="flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg">
                    <Zap className="w-3 h-3 shrink-0 mt-0.5 text-[var(--accent)]" />
                    <span>{issue.suggestedFix}</span>
                  </div>
                )}

                {isExpanded && fixable && !alreadyFixed && (
                  <div className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)]/50 px-2.5 py-2 rounded-lg space-y-1 border border-[var(--border)]/30">
                    <p className="font-medium text-[var(--text-secondary)] flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> What this fix
                      does:
                    </p>
                    <FixPreview
                      issue={issue}
                      nodes={nodes as any[]}
                      edges={edges as any[]}
                    />
                  </div>
                )}

                {/* Category tag + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-full">
                      {issue.category}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      Rule {issue.ruleId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {issue.targets.nodeIds.length > 0 && (
                      <button
                        onClick={() => handleFocus(issue)}
                        className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
                      >
                        <Focus className="w-3 h-3" /> Focus
                      </button>
                    )}
                    {fixable && !alreadyFixed && (
                      <button
                        onClick={() => handleFix(issue)}
                        disabled={hasPending}
                        className="flex items-center gap-1 text-[10px] font-semibold text-[var(--success)] bg-[var(--success)]/10 hover:bg-[var(--success)]/20 px-2 py-0.5 rounded-md transition-colors disabled:opacity-40"
                      >
                        <Wrench className="w-3 h-3" /> Preview Fix
                      </button>
                    )}
                    {alreadyFixed && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--success)]">
                        <Check className="w-3 h-3" /> Fixed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Version History ─── */}
        <div className="border-t border-[var(--border)]/30 pt-3 mt-2">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 w-full text-left text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {historyOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <History className="w-3.5 h-3.5" />
            Version History
            {snapshots.length > 0 && (
              <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded-full ml-auto">
                {snapshots.length}
              </span>
            )}
          </button>

          {historyOpen && (
            <div className="mt-2 space-y-1.5">
              {snapshots.length === 0 ? (
                <p className="text-[10px] text-[var(--text-muted)] py-2 text-center">
                  No saved versions yet. Versions are saved automatically
                  when you apply a fix.
                </p>
              ) : (
                snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[var(--bg-surface)] group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-[var(--text-primary)] truncate">
                        {snap.label}
                      </p>
                      <p className="text-[9px] text-[var(--text-muted)]">
                        {timeAgo(snap.timestamp)} &middot;{" "}
                        {snap.nodes.length} nodes, {snap.edges.length}{" "}
                        edges
                      </p>
                    </div>
                    <button
                      onClick={() => restoreSnapshot(snap.id)}
                      title="Restore this version"
                      className="flex items-center gap-1 text-[9px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 px-2 py-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                    <button
                      onClick={() => deleteSnapshot(snap.id)}
                      title="Delete this version"
                      className="flex items-center text-[var(--text-muted)] hover:text-[var(--error)] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FixPreview({
  issue,
  nodes,
  edges,
}: {
  issue: LintIssue;
  nodes: any[];
  edges: any[];
}) {
  const preview = useMemo(() => {
    const lines: string[] = [];
    const ruleId = issue.ruleId;

    const nodeLabel = (id: string) => {
      const node = nodes.find((n: any) => n.id === id);
      return node?.data?.label || node?.data?.componentId || id;
    };

    if (["S1", "P1", "P3", "P5", "R1", "R3", "ST5"].includes(ruleId)) {
      const componentMap: Record<string, string> = {
        S1: "Clerk (auth)",
        P1: "Redis (cache)",
        P3: "Cloudflare CDN",
        P5: "SQS (queue)",
        R1: "Sentry (monitoring)",
        R3: "GitHub Actions (CI/CD)",
        ST5: "FastAPI (backend)",
      };
      lines.push(`+ Add ${componentMap[ruleId]}`);
      lines.push("+ Wire connections to existing components");
    }

    if (ruleId === "ST3") {
      const hasBackend = nodes.some(
        (n: any) => n.data?.category === "backend"
      );
      if (hasBackend) {
        lines.push("- Remove direct frontend → database edge");
        lines.push("→ Use your existing backend as the intermediary");
      } else {
        lines.push("+ Add FastAPI backend");
        lines.push("+ frontend → FastAPI → database");
        lines.push("- Remove direct frontend → database edge");
      }
    }

    if (ruleId === "ST1") {
      const targetNode = nodes.find(
        (n: any) => n.id === issue.targets.nodeIds[0]
      );
      if (targetNode) {
        lines.push(
          `+ Connect ${targetNode.data?.label || "component"} to the nearest logical layer`
        );
      }
    }

    if (ruleId === "A1") {
      const hasBackend = nodes.some(
        (n: any) => n.data?.category === "backend"
      );
      if (hasBackend) {
        lines.push("- Remove frontend → AI direct edge");
        lines.push("+ Route: frontend → backend → AI");
      } else {
        lines.push("+ Add FastAPI backend");
        lines.push("- Remove frontend → AI direct edge");
        lines.push("+ Route: frontend → FastAPI → AI");
      }
    }

    if (issue.targets.edgeIds?.length) {
      for (const eid of issue.targets.edgeIds) {
        const edge = edges.find((e: any) => e.id === eid);
        if (edge) {
          lines.push(
            `  Edge: ${nodeLabel(edge.source)} → ${nodeLabel(edge.target)}`
          );
        }
      }
    }

    return lines;
  }, [issue, nodes, edges]);

  if (preview.length === 0) return null;

  return (
    <ul className="space-y-0.5 ml-1">
      {preview.map((line, i) => (
        <li
          key={i}
          className={`font-mono ${
            line.startsWith("+")
              ? "text-[var(--success)]"
              : line.startsWith("-")
                ? "text-[var(--error)]"
                : line.startsWith("→")
                  ? "text-[var(--accent)]"
                  : ""
          }`}
        >
          {line}
        </li>
      ))}
    </ul>
  );
}
