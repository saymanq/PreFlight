import { StateCreator } from "zustand";
import { generateId } from "@/lib/utils";
import type { LintIssue } from "@/lib/linting/lint-engine";
import type { ArchitectureStore } from "../index";

export interface ArchitectureSnapshot {
  id: string;
  label: string;
  nodes: any[];
  edges: any[];
  timestamp: number;
}

export interface PendingFix {
  issue: LintIssue | null;
  label: string;
  previewNodes: any[];
  previewEdges: any[];
  message: string;
  addedNodeIds: string[];
  addedEdgeIds: string[];
  removedEdgeIds: string[];
}

const MAX_SNAPSHOTS = 20;

export interface HistorySlice {
  snapshots: ArchitectureSnapshot[];
  pendingFix: PendingFix | null;

  saveSnapshot: (label: string) => void;
  restoreSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  stageFix: (pending: PendingFix) => void;
  applyPendingFix: () => void;
  rejectPendingFix: () => void;
}

export const createHistorySlice: StateCreator<ArchitectureStore, [], [], HistorySlice> = (set, get) => ({
  snapshots: [],
  pendingFix: null,

  saveSnapshot: (label: string) => {
    const { nodes, edges, snapshots } = get();
    const snap: ArchitectureSnapshot = {
      id: generateId(),
      label,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: Date.now(),
    };
    const updated = [snap, ...snapshots].slice(0, MAX_SNAPSHOTS);
    set({ snapshots: updated });
  },

  restoreSnapshot: (id: string) => {
    const { snapshots, nodes, edges } = get();
    const target = snapshots.find((s) => s.id === id);
    if (!target) return;

    const beforeSnap: ArchitectureSnapshot = {
      id: generateId(),
      label: `Before restore → "${target.label}"`,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: Date.now(),
    };
    const updated = [beforeSnap, ...snapshots].slice(0, MAX_SNAPSHOTS);

    set({ snapshots: updated });
    get().setNodes(target.nodes);
    get().setEdges(target.edges);
  },

  deleteSnapshot: (id: string) => {
    set({ snapshots: get().snapshots.filter((s) => s.id !== id) });
  },

  stageFix: (pending: PendingFix) => {
    set({ pendingFix: pending });
  },

  applyPendingFix: () => {
    const { pendingFix } = get();
    if (!pendingFix) return;

    get().saveSnapshot(`Before: ${pendingFix.label}`);
    get().setNodes(pendingFix.previewNodes);
    get().setEdges(pendingFix.previewEdges);
    set({ pendingFix: null });
  },

  rejectPendingFix: () => {
    set({ pendingFix: null });
  },
});
