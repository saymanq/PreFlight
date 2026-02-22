"use client";

import React, { useEffect, useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useArchitectureStore } from "@/lib/store";
import { scoreArchitecture, type ScoreResult } from "@/lib/scoring/score-engine";
import { TrendingUp } from "lucide-react";

function scoreLevel(s: number): string {
  if (s >= 8) return "excellent";
  if (s >= 6) return "good";
  if (s >= 4) return "moderate";
  return "poor";
}

function scoreColor(s: number): string {
  if (s >= 8) return "var(--score-excellent)";
  if (s >= 6) return "var(--score-good)";
  if (s >= 4) return "var(--score-moderate)";
  return "var(--score-poor)";
}

const DIMENSION_LABELS: Record<string, string> = {
  buildSpeed: "Build Speed",
  complexity: "Simplicity",
  scalability: "Scalability",
  estimatedCost: "Cost",
  opsBurden: "Low Ops",
  lockInRisk: "Portability",
  reliability: "Reliability",
  aiReadiness: "AI Ready",
};

export default function ScoresPanel() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const constraints = useArchitectureStore((s) => s.constraints);
  const setScores = useArchitectureStore((s) => s.setScores);

  const scores: ScoreResult = useMemo(() => {
    return scoreArchitecture(nodes as any[], edges as any[], constraints);
  }, [nodes, edges, constraints]);

  useEffect(() => {
    setScores(scores);
  }, [scores, setScores]);

  const radarData = Object.entries(scores.dimensions).map(([key, val]) => ({
    dimension: DIMENSION_LABELS[key] || key,
    value: val.score,
    fullMark: 10,
  }));

  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">Architecture Scores</h3>

      {/* Overall */}
      <div className="clay-sm p-4 text-center">
        <div className="text-3xl font-bold" style={{ color: scoreColor(scores.overall) }}>
          {scores.overall.toFixed(1)}
          <span className="text-base font-normal text-[var(--text-muted)]"> / 10</span>
        </div>
        <div className="score-bar mt-2">
          <div
            className="score-bar-fill"
            data-level={scoreLevel(scores.overall)}
            style={{ width: `${(scores.overall / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Radar Chart */}
      <div className="clay-sm p-3" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-dimension bars */}
      <div className="space-y-3">
        {Object.entries(scores.dimensions).map(([key, dim]) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {DIMENSION_LABELS[key] || key}
              </span>
              <span className="text-xs font-bold" style={{ color: scoreColor(dim.score) }}>
                {dim.score.toFixed(1)}
              </span>
            </div>
            <div className="score-bar">
              <div
                className="score-bar-fill"
                data-level={scoreLevel(dim.score)}
                style={{ width: `${(dim.score / 10) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-tight">{dim.explanation}</p>
          </div>
        ))}
      </div>

      {/* Constraint violations */}
      {scores.constraintViolations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[var(--warning)] uppercase">Constraint Violations</h4>
          {scores.constraintViolations.map((v, i) => (
            <div key={i} className="text-xs text-[var(--warning)] bg-[var(--warning-muted)] px-3 py-2 rounded-[var(--radius-sm)]">
              {v}
            </div>
          ))}
        </div>
      )}

      {/* Monthly cost */}
      <div className="clay-sm p-3 flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">Est. Monthly Cost</span>
        <span className="text-sm font-bold text-[var(--text-primary)]">
          ${scores.dimensions.estimatedCost.monthlyCost}/mo
        </span>
      </div>
    </div>
  );
}
