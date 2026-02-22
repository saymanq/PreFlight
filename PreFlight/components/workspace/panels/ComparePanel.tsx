"use client";

import React, { useState, useCallback } from "react";
import { useArchitectureStore } from "@/lib/architecture-store";
import { STRATEGY_PRESETS, type StrategyPreset } from "@/lib/generation/strategy-presets";
import { scoreArchitecture } from "@/lib/scoring/score-engine";
import { runLinter } from "@/lib/linting/lint-engine";
import type { CompareVariant } from "@/lib/architecture-store/slices/compareSlice";
import {
  GitCompare,
  Zap,
  BarChart3,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trophy,
  X,
} from "lucide-react";

const DIMENSION_LABELS: Record<string, string> = {
  buildSpeed: "Build Speed",
  complexity: "Simplicity",
  scalability: "Scalability",
  estimatedCost: "Cost Efficiency",
  opsBurden: "Low Ops Burden",
  lockInRisk: "Low Lock-in",
  reliability: "Reliability",
  aiReadiness: "AI Readiness",
};

function ScoreBar({ score, best }: { score: number; best: boolean }) {
  const level =
    score >= 8 ? "excellent" : score >= 6 ? "good" : score >= 4 ? "moderate" : "poor";
  return (
    <div className="flex items-center gap-2">
      <div className="score-bar flex-1 h-2">
        <div
          className="score-bar-fill"
          data-level={level}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className="text-[11px] font-mono font-semibold w-8 text-right">
        {score.toFixed(1)}
      </span>
      {best && <Trophy className="w-3 h-3 text-yellow-500" />}
    </div>
  );
}

export default function ComparePanel() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const constraints = useArchitectureStore((s) => s.constraints);
  const setVariants = useArchitectureStore((s) => s.setVariants);
  const variants = useArchitectureStore((s) => s.variants);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateVariants = useCallback(() => {
    if (nodes.length === 0) return;
    setLoading(true);

    const results: CompareVariant[] = STRATEGY_PRESETS.map((preset) => {
      const constraintOverrides = {
        ...constraints,
        devExperienceGoal: preset.id === "mvp_speed" ? "mvp_speed" as const :
          preset.id === "scale_first" ? "scale_ready" as const : "balanced" as const,
      };

      const scores = scoreArchitecture(nodes as any[], edges as any[], constraintOverrides);
      const lintIssues = runLinter(nodes as any[], edges as any[], constraintOverrides);

      return {
        id: preset.id,
        strategyId: preset.id,
        strategyName: preset.name,
        nodes: nodes as any[],
        edges: edges as any[],
        scores,
        lintIssues,
        monthlyCost: scores.dimensions.estimatedCost.monthlyCost,
      };
    });

    setVariants(results);
    setLoading(false);
  }, [nodes, edges, constraints, setVariants]);

  const clearCompare = useCallback(() => {
    setVariants([]);
  }, [setVariants]);

  const bestOverall = variants.length > 0
    ? Math.max(...variants.map((v) => v.scores?.overall ?? 0))
    : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold gradient-text uppercase tracking-wider flex items-center gap-2">
          <GitCompare className="w-4 h-4" />
          Compare Strategies
        </h3>
        {variants.length > 0 && (
          <button
            onClick={clearCompare}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {variants.length === 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Compare your current architecture scored under different strategy presets to see how
            trade-offs shift.
          </p>

          <div className="space-y-2">
            {STRATEGY_PRESETS.map((p) => (
              <div key={p.id} className="clay-sm p-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">{p.name}</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{p.description}</p>
              </div>
            ))}
          </div>

          <button
            onClick={generateVariants}
            disabled={loading || nodes.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-semibold btn-gradient"
          >
            {loading ? (
              "Generating..."
            ) : (
              <>
                <BarChart3 className="w-3.5 h-3.5" />
                Compare All Strategies
              </>
            )}
          </button>

          {nodes.length === 0 && (
            <p className="text-[10px] text-[var(--warning)] text-center">
              Add components to the canvas first
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((v) => {
            const isBest = v.scores?.overall === bestOverall;
            const isExpanded = expanded === v.id;
            const scores = v.scores;

            return (
              <div
                key={v.id}
                className={`clay-sm p-3 space-y-2 transition-all ${
                  isBest ? "ring-1 ring-[var(--accent)]" : ""
                }`}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : v.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {isBest && <Trophy className="w-3.5 h-3.5 text-yellow-500" />}
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {v.strategyName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--accent)]">
                      {scores?.overall?.toFixed(1) ?? "—"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
                    )}
                  </div>
                </button>

                {/* Quick stats */}
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-2.5 h-2.5" />
                    ${v.monthlyCost}/mo
                  </span>
                  {v.lintIssues && (
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {v.lintIssues.filter((i: any) => i.severity === "error").length} errors
                    </span>
                  )}
                  {v.lintIssues && v.lintIssues.filter((i: any) => i.severity === "warning").length > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {v.lintIssues.filter((i: any) => i.severity === "warning").length} warns
                    </span>
                  )}
                </div>

                {/* Expanded dimension breakdown */}
                {isExpanded && scores?.dimensions && (
                  <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                    {Object.entries(scores.dimensions).map(([key, dim]: [string, any]) => {
                      const allScoresForDim = variants
                        .map((vv) => (vv.scores?.dimensions as any)?.[key]?.score ?? 0);
                      const bestForDim = Math.max(...allScoresForDim);
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {DIMENSION_LABELS[key] || key}
                            </span>
                          </div>
                          <ScoreBar score={dim.score} best={dim.score === bestForDim && variants.length > 1} />
                        </div>
                      );
                    })}

                    {scores.constraintViolations?.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] font-semibold text-[var(--error)] mb-1">
                          Constraint Violations
                        </p>
                        {scores.constraintViolations.map((v: string, i: number) => (
                          <p key={i} className="text-[10px] text-[var(--error)]">• {v}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={generateVariants}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors border border-[var(--border)]"
          >
            <BarChart3 className="w-3 h-3" />
            Re-run Comparison
          </button>
        </div>
      )}
    </div>
  );
}
