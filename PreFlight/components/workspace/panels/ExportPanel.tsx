"use client";

import React, { useState, useCallback } from "react";
import { useArchitectureStore } from "@/lib/architecture-store";
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

type ExportFormat = "prd" | "mermaid" | "prompts" | "readme" | "pdf" | "json" | "full";

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
    label: "Architecture Report (AI)",
    description: "Professional architecture report with goals, alternatives, implementation guide, and rollout plan",
    icon: Terminal,
    ext: ".md",
  },
  {
    id: "readme",
    label: "README (AI)",
    description: "README.md generated from the architecture report for quick onboarding and implementation",
    icon: FileText,
    ext: ".md",
  },
  {
    id: "pdf",
    label: "Architecture Report (PDF)",
    description: "Professional PDF export of the AI architecture report for sharing with teams and stakeholders",
    icon: Download,
    ext: ".pdf",
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

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (m) => m.trim())
    .trim();
}

type ReportSection = {
  title: string;
  body: string;
};

function parseReportSections(markdown: string): ReportSection[] {
  const lines = markdown.split("\n");
  const sections: ReportSection[] = [];

  let currentTitle = "Architecture Report";
  let currentBody: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      if (currentBody.length > 0) {
        sections.push({
          title: currentTitle,
          body: markdownToPlainText(currentBody.join("\n")).trim(),
        });
      }
      currentTitle = heading[1].trim();
      currentBody = [];
      continue;
    }
    currentBody.push(line);
  }

  if (currentBody.length > 0) {
    sections.push({
      title: currentTitle,
      body: markdownToPlainText(currentBody.join("\n")).trim(),
    });
  }

  return sections.filter((s) => s.body.length > 0);
}

async function downloadPdfFromMarkdown(markdown: string, filename: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const maxWidth = pageWidth - margin * 2;
  const contentBottom = pageHeight - margin - 18;

  const drawPageFrame = () => {
    doc.setDrawColor(18, 18, 18);
    doc.setLineWidth(1.2);
    doc.roundedRect(margin - 10, margin - 10, maxWidth + 20, pageHeight - margin * 2 + 6, 8, 8, "S");
    doc.setDrawColor(170, 170, 170);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin - 6, margin - 6, maxWidth + 12, pageHeight - margin * 2 - 2, 6, 6, "S");
  };

  let pageNo = 1;
  const drawFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`PreFlight Architecture Report  •  Page ${pageNo}`, margin, pageHeight - margin + 8);
  };

  drawPageFrame();

  // Cover page
  const title = (markdown.match(/^#\s+(.+)$/m)?.[1] ?? "Architecture Report").trim();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(5, 115, 45);
  doc.text(title, margin, margin + 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text("Professional System Architecture Report", margin, margin + 66);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 84);

  doc.setDrawColor(5, 115, 45);
  doc.setLineWidth(1.5);
  doc.line(margin, margin + 96, margin + 220, margin + 96);

  drawFooter();

  doc.addPage();
  pageNo += 1;
  drawPageFrame();
  let y = margin + 10;

  const sections = parseReportSections(markdown);
  for (const section of sections) {
    const titleLines = doc.splitTextToSize(section.title, maxWidth - 24) as string[];
    const bodyLines = doc.splitTextToSize(section.body, maxWidth - 24) as string[];
    const sectionHeight = 18 + titleLines.length * 13 + bodyLines.length * 12 + 20;

    if (y + sectionHeight > contentBottom) {
      drawFooter();
      doc.addPage();
      pageNo += 1;
      drawPageFrame();
      y = margin + 10;
    }

    doc.setDrawColor(155, 155, 155);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, maxWidth, sectionHeight, 7, 7, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(5, 115, 45);
    doc.text(titleLines, margin + 12, y + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text(bodyLines, margin + 12, y + 38);

    y += sectionHeight + 10;
  }

  drawFooter();

  doc.save(filename);
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

interface ExportPanelProps {
  projectId: string;
  sourceIdeationSnapshot?: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  }>;
}

export default function ExportPanel({
  projectId,
  sourceIdeationSnapshot,
}: ExportPanelProps) {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const scores = useArchitectureStore((s) => s.scores);
  const lintIssues = useArchitectureStore((s) => s.lintIssues);
  const constraints = useArchitectureStore((s) => s.constraints);
  const features = useArchitectureStore((s) => s.features);
  const projectName = useArchitectureStore((s) => s.projectName);
  const chatMessages = useArchitectureStore((s) => s.chatMessages);

  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [lastBundle, setLastBundle] = useState<ExportBundle | null>(null);
  const [preview, setPreview] = useState<{ format: ExportFormat; content: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAiReport, setLastAiReport] = useState<string | null>(null);

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

  const generateArchitectureReport = useCallback(async () => {
    if (lastAiReport) {
      return lastAiReport;
    }

    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        projectName: projectName || "Untitled Project",
        nodes,
        edges,
        scores: scores?.dimensions ?? scores ?? {},
        constraints,
        features: features.map((f) => f.name),
        sourceIdeationSnapshot: sourceIdeationSnapshot ?? [],
        workspaceChatMessages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate architecture report");
    }

    const data = await response.json();
    const report = (data.reportMarkdown ?? data.promptPack ?? "").trim() as string;
    setLastAiReport(report);
    return report;
  }, [
    lastAiReport,
    projectId,
    projectName,
    nodes,
    edges,
    scores,
    constraints,
    features,
    sourceIdeationSnapshot,
    chatMessages,
  ]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (nodes.length === 0) return;
      setExporting(format);
      setErrorMessage(null);

      const bundle = buildBundle();
      setLastBundle(bundle);
      const safeName = (projectName || "preflight-export").replace(/\s+/g, "-").toLowerCase();

      try {
        switch (format) {
          case "prd":
            downloadFile(bundle.prdMarkdown, `${safeName}-prd.md`, "text/markdown");
            break;
          case "mermaid":
            downloadFile(bundle.mermaidDiagram, `${safeName}-diagram.mmd`, "text/plain");
            break;
          case "prompts": {
            const reportMarkdown = await generateArchitectureReport();
            downloadFile(
              reportMarkdown || "Report generation returned empty content.",
              `${safeName}-architecture-report.md`,
              "text/markdown"
            );
            break;
          }
          case "readme": {
            const reportMarkdown = await generateArchitectureReport();
            const readme = `# ${projectName || "Untitled Project"}\n\n${reportMarkdown}`;
            downloadFile(readme, `${safeName}-README.md`, "text/markdown");
            break;
          }
          case "pdf": {
            const reportMarkdown = await generateArchitectureReport();
            await downloadPdfFromMarkdown(
              reportMarkdown || "Report generation returned empty content.",
              `${safeName}-architecture-report.pdf`
            );
            break;
          }
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
      } catch (error) {
        console.error("Export failed:", error);
        setErrorMessage("Could not generate AI report. Check API key and try again.");
      } finally {
        setTimeout(() => setExporting(null), 1000);
      }
    },
    [nodes, projectName, buildBundle, generateArchitectureReport]
  );

  const handlePreview = useCallback(
    async (format: ExportFormat) => {
      if (nodes.length === 0) return;
      setErrorMessage(null);

      if (preview?.format === format) {
        setPreview(null);
        return;
      }

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
          try {
            setExporting("prompts");
            content = await generateArchitectureReport();
          } catch (error) {
            console.error("Preview generation failed:", error);
            setErrorMessage("Could not generate AI report preview.");
            content = "Report generation failed. Please retry.";
          } finally {
            setExporting(null);
          }
          break;
        case "readme":
          content = `# ${projectName || "Untitled Project"}\n\n${await generateArchitectureReport()}`;
          break;
        case "pdf":
          content = "PDF will be generated from the Architecture Report content when you click Download.";
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

      setPreview({ format, content });
    },
    [nodes, buildBundle, preview, generateArchitectureReport, projectName]
  );

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold gradient-text uppercase tracking-wider flex items-center gap-2">
        <FileOutput className="w-4 h-4" />
        Export
      </h3>

      {nodes.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Add components to the canvas to enable export.</p>
      ) : (
        <div className="space-y-2">
          {errorMessage && (
            <div className="text-[11px] text-[var(--error)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2">
              {errorMessage}
            </div>
          )}
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-semibold btn-gradient"
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
