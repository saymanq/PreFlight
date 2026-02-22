import { generateMermaidDiagram } from "./mermaid-generator";
import { generatePromptPack } from "./prompt-pack-generator";
import { generatePRDMarkdown } from "./prd-generator";

interface ExportOptions {
  projectName: string;
  description: string;
  nodes: any[];
  edges: any[];
  scores: any;
  lintIssues: any[];
  constraints: Record<string, any>;
  features: string[];
}

export interface ExportBundle {
  projectName: string;
  generatedAt: string;
  prdMarkdown: string;
  mermaidDiagram: string;
  promptPack: any[];
  architectureJSON: { nodes: any[]; edges: any[] };
  scores: any;
  lintIssues: any[];
}

export function generateExportBundle(options: ExportOptions): ExportBundle {
  return {
    projectName: options.projectName,
    generatedAt: new Date().toISOString(),
    prdMarkdown: generatePRDMarkdown(
      options.projectName,
      options.description,
      options.nodes,
      options.scores,
      options.features,
      options.constraints
    ),
    mermaidDiagram: generateMermaidDiagram(options.nodes, options.edges),
    promptPack: generatePromptPack(
      options.nodes,
      options.edges,
      options.projectName,
      options.features
    ),
    architectureJSON: { nodes: options.nodes, edges: options.edges },
    scores: options.scores,
    lintIssues: options.lintIssues,
  };
}
