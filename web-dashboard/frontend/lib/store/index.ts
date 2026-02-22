import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createNodeSlice, NodeSlice } from "./slices/nodeSlice";
import { createScopeSlice, ScopeSlice } from "./slices/scopeSlice";
import { createChatSlice, createProjectSlice, ChatSlice, ProjectSlice } from "./slices/projectSlice";
import { createConstraintSlice, ConstraintSlice } from "./slices/constraintSlice";
import { createScoreSlice, ScoreSlice } from "./slices/scoreSlice";
import { createLintSlice, LintSlice } from "./slices/lintSlice";
import { createFeatureSlice, FeatureSlice } from "./slices/featureSlice";
import { createCompareSlice, CompareSlice } from "./slices/compareSlice";
import { createAssistantSlice, AssistantSlice } from "./slices/assistantSlice";
import { createExportSlice, ExportSlice } from "./slices/exportSlice";
import { createHistorySlice, HistorySlice } from "./slices/historySlice";

export interface ArchitectureStore
  extends NodeSlice,
    ScopeSlice,
    ChatSlice,
    ProjectSlice,
    ConstraintSlice,
    ScoreSlice,
    LintSlice,
    FeatureSlice,
    CompareSlice,
    AssistantSlice,
    ExportSlice,
    HistorySlice {}

export const useArchitectureStore = create<ArchitectureStore>()(
  persist(
    (...a) => ({
      ...createNodeSlice(...a),
      ...createScopeSlice(...a),
      ...createChatSlice(...a),
      ...createProjectSlice(...a),
      ...createConstraintSlice(...a),
      ...createScoreSlice(...a),
      ...createLintSlice(...a),
      ...createFeatureSlice(...a),
      ...createCompareSlice(...a),
      ...createAssistantSlice(...a),
      ...createExportSlice(...a),
      ...createHistorySlice(...a),
    }),
    {
      name: "preflight-storage",
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        scope: state.scope,
        suggestions: state.suggestions,
        chatMessages: state.chatMessages,
        projectName: state.projectName,
        constraints: state.constraints,
        features: state.features,
        snapshots: state.snapshots,
      }),
    }
  )
);
