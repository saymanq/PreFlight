import { create } from "zustand";
import {
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
} from "@xyflow/react";

export interface ArchNode extends Node {
    data: {
        type: string;
        category: string;
        label: string;
        provider: string;
        icon: string;
        config: Record<string, unknown>;
        tags: string[];
    };
}

export interface ArchEdge extends Edge {
    data?: {
        relationshipType: string;
        protocol: string;
        metadata?: Record<string, unknown>;
    };
}

interface WorkspaceState {
    // Canvas state
    nodes: ArchNode[];
    edges: ArchEdge[];
    selectedNodeId: string | null;
    selectedEdgeId: string | null;

    // UI state
    rightPanelTab: "inspector" | "scores" | "lint" | "assistant";
    leftSidebarTab: "components" | "features";
    isDirty: boolean;
    isGenerating: boolean;
    isSaving: boolean;

    // Actions
    setNodes: (nodes: ArchNode[]) => void;
    setEdges: (edges: ArchEdge[]) => void;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addNode: (node: ArchNode) => void;
    removeNode: (nodeId: string) => void;
    updateNodeData: (nodeId: string, data: Partial<ArchNode["data"]>) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    setRightPanelTab: (tab: WorkspaceState["rightPanelTab"]) => void;
    setLeftSidebarTab: (tab: WorkspaceState["leftSidebarTab"]) => void;
    setIsDirty: (dirty: boolean) => void;
    setIsGenerating: (generating: boolean) => void;
    setIsSaving: (saving: boolean) => void;
    resetCanvas: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    rightPanelTab: "inspector",
    leftSidebarTab: "components",
    isDirty: false,
    isGenerating: false,
    isSaving: false,

    setNodes: (nodes) => set({ nodes, isDirty: true }),
    setEdges: (edges) => set({ edges, isDirty: true }),

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes) as ArchNode[],
            isDirty: true,
        });
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges) as ArchEdge[],
            isDirty: true,
        });
    },

    onConnect: (connection) => {
        set({
            edges: addEdge(
                {
                    ...connection,
                    type: "custom",
                    animated: true,
                    data: { relationshipType: "invokes", protocol: "RPC" },
                },
                get().edges
            ) as ArchEdge[],
            isDirty: true,
        });
    },

    addNode: (node) =>
        set({ nodes: [...get().nodes, node], isDirty: true }),

    removeNode: (nodeId) =>
        set({
            nodes: get().nodes.filter((n) => n.id !== nodeId),
            edges: get().edges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId
            ),
            selectedNodeId:
                get().selectedNodeId === nodeId ? null : get().selectedNodeId,
            isDirty: true,
        }),

    updateNodeData: (nodeId, data) =>
        set({
            nodes: get().nodes.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
            ),
            isDirty: true,
        }),

    setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
    setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
    setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
    setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),
    setIsDirty: (isDirty) => set({ isDirty }),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setIsSaving: (isSaving) => set({ isSaving }),

    resetCanvas: () =>
        set({
            nodes: [],
            edges: [],
            selectedNodeId: null,
            selectedEdgeId: null,
            isDirty: true,
        }),
}));
