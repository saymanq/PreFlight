"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Layers,
  Radar,
  ShieldCheck,
  FileOutput,
  Sparkles,
  GitCompare,
  ListChecks,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-10 glass px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">Preflight</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/plan"
              className="text-sm px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--text-inverse)] font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Start Planning
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow px-6 py-16">
        <div className="max-w-5xl mx-auto space-y-24">
          {/* Hero */}
          <section className="text-center space-y-6 pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-muted)] border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Architecture Planning for the AI Era
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
              Plan before you build.
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] bg-clip-text text-transparent">
                Score before you ship.
              </span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              The visual architecture planning layer for AI-assisted development.
              Design your system, score it across 8 dimensions, lint it for anti-patterns,
              and export implementation prompts for Cursor and Claude Code.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link
                href="/plan"
                className="group flex items-center gap-2 px-8 py-4 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white font-semibold text-lg shadow-[var(--clay-glow)] hover:shadow-[0_0_30px_rgba(0,212,255,0.35)] transition-all duration-300"
              >
                Start Planning
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-8 py-4 rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-lg hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-300 clay-interactive"
              >
                Go to Dashboard
              </Link>
            </div>
          </section>

          {/* How It Works */}
          <section className="space-y-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Describe", desc: "Tell us your idea and constraints. Budget, team size, timeline, traffic expectations." },
                { step: "2", title: "Plan", desc: "AI generates your architecture, scores it across 8 dimensions, and lints it for anti-patterns." },
                { step: "3", title: "Build", desc: "Export prompt packs, PRDs, and build orders for Cursor, Claude Code, or Lovable." },
              ].map((item) => (
                <div key={item.step} className="clay p-6 space-y-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] font-bold text-lg flex items-center justify-center mx-auto">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Feature Cards */}
          <section className="space-y-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center">What Makes Preflight Different</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Layers, title: "Visual Architecture Canvas", desc: "Drag-drop components, connect services, see your entire system at a glance. Not just diagrams — intelligent nodes with real metadata.", color: "var(--accent)" },
                { icon: Radar, title: "8-Dimension Scoring", desc: "Cost, complexity, scalability, ops burden, build speed, lock-in risk, reliability, AI-readiness. Quantified, not guessed.", color: "var(--secondary)" },
                { icon: ShieldCheck, title: "Architecture Linter", desc: "30+ rules catch anti-patterns before you write code. No auth on user data? LLM in sync path? We flag it.", color: "var(--error)" },
                { icon: FileOutput, title: "Implementation Handoff", desc: "Export structured prompt packs for Cursor, Claude Code, or Lovable. PRDs, Mermaid diagrams, and build orders included.", color: "var(--success)" },
                { icon: GitCompare, title: "What-If Compare Mode", desc: "Generate 3 architecture variants (MVP, Balanced, Scale-Ready) and compare scores side-by-side. Choose your trade-off.", color: "var(--warning)" },
                { icon: ListChecks, title: "Feature-First Planning", desc: "Plan by feature, not monolith. Each feature shows architecture diffs, score impact, and implementation tasks.", color: "var(--info)" },
              ].map((card) => (
                <div key={card.title} className="clay p-6 space-y-3">
                  <div
                    className="w-11 h-11 rounded-[var(--radius-sm)] flex items-center justify-center"
                    style={{ background: `color-mix(in srgb, ${card.color} 15%, transparent)` }}
                  >
                    <card.icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{card.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="clay-lg p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "60+", label: "Components" },
                { value: "30+", label: "Lint Rules" },
                { value: "8", label: "Score Dimensions" },
                { value: "4", label: "Strategy Presets" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-[var(--text-muted)] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center space-y-4 pb-12">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Ready to plan your next build?</h2>
            <Link
              href="/plan"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white font-semibold text-lg shadow-[var(--clay-glow)] hover:shadow-[0_0_30px_rgba(0,212,255,0.35)] transition-all duration-300"
            >
              Start Planning Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>Preflight &mdash; Plan before you build.</span>
          <span>Built for HackED 2026</span>
        </div>
      </footer>
    </div>
  );
}
