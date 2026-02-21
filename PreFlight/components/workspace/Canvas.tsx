"use client";

import React, { useCallback, useRef, DragEvent } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    type NodeTypes,
    type EdgeTypes,
    type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspaceStore, type ArchNode } from "@/lib/store";
import { CustomNode } from "./CustomNode";
import { CustomEdge } from "./CustomEdge";
import { getComponentByType } from "@/lib/component-catalog";

const nodeTypes: NodeTypes = {
    custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
    custom: CustomEdge,
};

export function Canvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        setSelectedNodeId,
        setSelectedEdgeId,
    } = useWorkspaceStore();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reactFlowInstance = useRef<any>(null);

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            const componentType = event.dataTransfer.getData("application/preflight-component");
            if (!componentType) return;

            const component = getComponentByType(componentType);
            if (!component) return;

            const position = reactFlowInstance.current?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            }) ?? { x: 0, y: 0 };

            const newNode: ArchNode = {
                id: `${componentType}_${Date.now()}`,
                type: "custom",
                position,
                data: {
                    type: component.type,
                    category: component.category,
                    label: component.label,
                    provider: component.provider,
                    icon: component.icon,
                    config: { ...component.defaultConfig },
                    tags: [...component.tags],
                },
            };

            addNode(newNode);
        },
        [addNode]
    );

    return (
        <div className="flex-1 h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={(instance) => {
                    reactFlowInstance.current = instance;
                }}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
                onPaneClick={() => {
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onDragOver={onDragOver}
                onDrop={onDrop}
                fitView
                deleteKeyCode={["Backspace", "Delete"]}
                className="bg-background"
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="oklch(0.3 0 0 / 40%)"
                />
                <Controls
                    showInteractive={false}
                    className="!shadow-lg"
                />
                <MiniMap
                    nodeStrokeWidth={3}
                    className="!rounded-lg"
                    maskColor="oklch(0 0 0 / 50%)"
                />
            </ReactFlow>
        </div>
    );
}
