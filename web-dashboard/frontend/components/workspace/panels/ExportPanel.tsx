"use client";

import React, { useState, useCallback } from "react";
import { useArchitectureStore } from "@/lib/store";
import { generateExportBundle, type ExportBundle } from "@/lib/export/export-engine";
import {
  FileOutput,
  FileText,
  GitBranch,
  Terminal,
  FileJson,
  Download,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

type ExportFormat = "prd" | "mermaid" | "prompts" | "json" | "full";

const EXPORT_OPTIONS: {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  ext: string;
}[] = [
  {
    id: "prd",
    label: "PRD (Markdown)",
    description: "Architecture requirements document with scores, constraints, and build order",
    icon: FileText,
    ext: ".md",
  },
  {
    id: "mermaid",
    label: "Mermaid Diagram",
    description: "Architecture graph as a Mermaid flowchart for docs and READMEs",
    icon: GitBranch,
    ext: ".mmd",
  },
  {
    id: "prompts",
    label: "Prompt Pack",
    description: "Step-by-step implementation prompts for AI coding tools (Cursor, Claude, etc.)",
    icon: Terminal,
    ext: ".json",
  },
  {
    id: "json",
    label: "Architecture JSON",
    description: "Raw nodes, edges, scores, and lint data as structured JSON",
    icon: FileJson,
    ext: ".json",
  },
  {
    id: "full",
    label: "Full Bundle",
    description: "Everything above in a single JSON export",
    icon: Download,
    ext: ".json",
  },
];

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function ExportPanel() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const scores = useArchitectureStore((s) => s.scores);
  const lintIssues = useArchitectureStore((s) => s.lintIssues);
  const constraints = useArchitectureStore((s) => s.constraints);
  const features = useArchitectureStore((s) => s.features);
  const projectName = useArchitectureStore((s) => s.projectName);

  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [lastBundle, setLastBundle] = useState<ExportBundle | null>(null);
  const [preview, setPreview] = useState<{ format: ExportFormat; content: string } | null>(null);

  const buildBundle = useCallback((): ExportBundle => {
    return generateExportBundle({
      projectName: projectName || "Untitled Project",
      description: "",
      nodes: nodes as any[],
      edges: edges as any[],
      scores,
      lintIssues,
      constraints,
      features: features.map((f) => f.name),
    });
  }, [nodes, edges, scores, lintIssues, constraints, features, projectName]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (nodes.length === 0) return;
      setExporting(format);

      const bundle = buildBundle();
      setLastBundle(bundle);
      const safeName = (projectName || "preflight-export").replace(/\s+/g, "-").toLowerCase();

      switch (format) {
        case "prd":
          downloadFile(bundle.prdMarkdown, `${safeName}-prd.md`, "text/markdown");
          break;
        case "mermaid":
          downloadFile(bundle.mermaidDiagram, `${safeName}-diagram.mmd`, "text/plain");
          break;
        case "prompts":
          downloadFile(
            JSON.stringify(bundle.promptPack, null, 2),
            `${safeName}-prompts.json`,
            "application/json"
          );
          break;
        case "json":
          downloadFile(
            JSON.stringify(
              { nodes: bundle.architectureJSON.nodes, edges: bundle.architectureJSON.edges, scores: bundle.scores, lintIssues: bundle.lintIssues },
              null,
              2
            ),
            `${safeName}-architecture.json`,
            "application/json"
          );
          break;
        case "full":
          downloadFile(
            JSON.stringify(bundle, null, 2),
            `${safeName}-full-bundle.json`,
            "application/json"
          );
          break;
      }

      setTimeout(() => setExporting(null), 1000);
    },
    [nodes, projectName, buildBundle]
  );

  const handlePreview = useCallback(
    (format: ExportFormat) => {
      if (nodes.length === 0) return;
      const bundle = buildBundle();

      let content = "";
      switch (format) {
        case "prd":
          content = bundle.prdMarkdown;
          break;
        case "mermaid":
          content = bundle.mermaidDiagram;
          break;
        case "prompts":
          content = JSON.stringify(bundle.promptPack, null, 2);
          break;
        case "json":
          content = JSON.stringify(
            { nodes: bundle.architectureJSON.nodes, edges: bundle.architectureJSON.edges, scores: bundle.scores },
            null,
            2
          );
          break;
        case "full":
          content = JSON.stringify(bundle, null, 2);
          break;
      }

      setPreview(preview?.format === format ? null : { format, content });
    },
    [nodes, buildBundle, preview]
  );

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
        <FileOutput className="w-4 h-4" />
        Export
      </h3>

      {nodes.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Add components to the canvas to enable export.</p>
      ) : (
        <div className="space-y-2">
          {EXPORT_OPTIONS.map((opt) => {
            const isExporting = exporting === opt.id;
            return (
              <div key={opt.id} className="clay-sm p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <opt.icon className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {opt.label}
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] font-mono">{opt.ext}</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport(opt.id)}
                    disabled={isExporting}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-semibold bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] text-white hover:shadow-[var(--clay-glow)] transition-all disabled:opacity-50"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    {isExporting ? "Exporting..." : "Download"}
                  </button>
                  <button
                    onClick={() => handlePreview(opt.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors border border-[var(--border)]"
                  >
                    {preview?.format === opt.id ? "Hide" : "Preview"}
                  </button>
                </div>

                {preview?.format === opt.id && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-end">
                      <CopyButton text={preview.content} />
                    </div>
                    <pre className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] p-3 rounded-[var(--radius-sm)] overflow-auto max-h-60 whitespace-pre-wrap break-words font-mono leading-relaxed border border-[var(--border)]">
                      {preview.content.slice(0, 3000)}
                      {preview.content.length > 3000 && "\n\n... (truncated in preview)"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
