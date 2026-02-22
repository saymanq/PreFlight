"use client";

import React, { useMemo } from "react";
import { useArchitectureStore } from "@/lib/architecture-store";
import {
  Check,
  X,
  Plus,
  Minus,
  Link2,
  ArrowRight,
  ShieldCheck,
  Layers,
} from "lucide-react";

export default function FixProposal() {
  const pendingFix = useArchitectureStore((s) => s.pendingFix);
  const applyPendingFix = useArchitectureStore((s) => s.applyPendingFix);
  const rejectPendingFix = useArchitectureStore((s) => s.rejectPendingFix);
  const currentNodes = useArchitectureStore((s) => s.nodes);
  const currentEdges = useArchitectureStore((s) => s.edges);

  const diff = useMemo(() => {
    if (!pendingFix) return null;

    const currentNodeIds = new Set(currentNodes.map((n: any) => n.id));
    const currentEdgeIds = new Set(currentEdges.map((e: any) => e.id));

    const addedNodes = pendingFix.previewNodes.filter(
      (n: any) => !currentNodeIds.has(n.id)
    );
    const addedEdges = pendingFix.previewEdges.filter(
      (e: any) => !currentEdgeIds.has(e.id)
    );
    const removedEdges = currentEdges.filter(
      (e: any) => !pendingFix.previewEdges.some((pe: any) => pe.id === e.id)
    );

    const nodeLabel = (id: string, list: any[]) => {
      const node = list.find((n: any) => n.id === id);
      return node?.data?.label || node?.data?.componentId || id.split("-")[0];
    };

    return { addedNodes, addedEdges, removedEdges, nodeLabel };
  }, [pendingFix, currentNodes, currentEdges]);

  if (!pendingFix || !diff) return null;

  const totalChanges =
    diff.addedNodes.length + diff.addedEdges.length + diff.removedEdges.length;

  return (
    <div className="absolute inset-0 z-20 bg-[var(--bg-base)]/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]/30">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Proposed Fix
          </h3>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">
          {pendingFix.label}
        </p>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Summary counts */}
        <div className="flex items-center gap-4 text-[11px] px-3 py-2 rounded-lg bg-[var(--bg-surface)]">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Layers className="w-3 h-3" />
            {currentNodes.length} nodes → {pendingFix.previewNodes.length}
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Link2 className="w-3 h-3" />
            {currentEdges.length} edges → {pendingFix.previewEdges.length}
          </span>
        </div>

        {/* Message */}
        <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--accent)]/5 border border-[var(--accent)]/20 px-3 py-2 rounded-lg flex items-start gap-2">
          <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-[var(--accent)]" />
          <span>{pendingFix.message}</span>
        </div>

        {/* Added Nodes */}
        {diff.addedNodes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Components to add
            </p>
            {diff.addedNodes.map((node: any) => (
              <div
                key={node.id}
                className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg bg-[var(--success)]/5 border border-[var(--success)]/20"
              >
                <Plus className="w-3 h-3 text-[var(--success)] shrink-0" />
                <span className="font-medium text-[var(--success)]">
                  {node.data?.label || node.data?.componentId}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded-full">
                  {node.data?.category}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Added Edges */}
        {diff.addedEdges.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Connections to create
            </p>
            {diff.addedEdges.map((edge: any) => {
              const allNodes = pendingFix.previewNodes;
              return (
                <div
                  key={edge.id}
                  className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg bg-[var(--success)]/5 border border-[var(--success)]/20"
                >
                  <Link2 className="w-3 h-3 text-[var(--success)] shrink-0" />
                  <span className="text-[var(--success)]">
                    {diff.nodeLabel(edge.source, allNodes)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                  <span className="text-[var(--success)]">
                    {diff.nodeLabel(edge.target, allNodes)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Removed Edges */}
        {diff.removedEdges.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Connections to remove
            </p>
            {diff.removedEdges.map((edge: any) => (
              <div
                key={edge.id}
                className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg bg-[var(--error)]/5 border border-[var(--error)]/20"
              >
                <Minus className="w-3 h-3 text-[var(--error)] shrink-0" />
                <span className="text-[var(--error)]">
                  {diff.nodeLabel(edge.source, currentNodes)}
                </span>
                <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                <span className="text-[var(--error)]">
                  {diff.nodeLabel(edge.target, currentNodes)}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalChanges === 0 && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
            No visible changes detected.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-[var(--border)]/30 flex items-center gap-2">
        <button
          onClick={applyPendingFix}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--success)] hover:brightness-110 transition-all"
        >
          <Check className="w-3.5 h-3.5" />
          Apply Changes
        </button>
        <button
          onClick={rejectPendingFix}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-all"
        >
          <X className="w-3.5 h-3.5" />
          Discard
        </button>
      </div>
    </div>
  );
}
