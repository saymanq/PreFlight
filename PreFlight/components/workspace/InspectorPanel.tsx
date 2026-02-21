"use client";

import React from "react";
import { useWorkspaceStore } from "@/lib/store";
import { getComponentByType, CATEGORY_COLORS } from "@/lib/component-catalog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
    Globe, Monitor, Smartphone, Server, Network, Cog, ExternalLink,
    Database, Zap, Layers, Shield, Lock, HardDrive, Brain, ShieldCheck,
    List, Clock, BarChart3, Activity, MousePointer,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
    Globe, Monitor, Smartphone, Server, Network, Cog, ExternalLink,
    Database, Zap, Layers, Shield, Lock, HardDrive, Brain, ShieldCheck,
    List, Clock, BarChart3, Activity,
};

export function InspectorPanel() {
    const { nodes, edges, selectedNodeId, selectedEdgeId, updateNodeData } = useWorkspaceStore();

    const selectedNode = selectedNodeId
        ? nodes.find((n) => n.id === selectedNodeId)
        : null;

    const selectedEdge = selectedEdgeId
        ? edges.find((e) => e.id === selectedEdgeId)
        : null;

    if (!selectedNode && !selectedEdge) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <MousePointer className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm">Select a node or edge</p>
                <p className="text-xs mt-1">Click on a component to inspect it</p>
            </div>
        );
    }

    if (selectedNode) {
        const nodeData = selectedNode.data;
        const catalogInfo = getComponentByType(nodeData.type);
        const color = CATEGORY_COLORS[nodeData.category as keyof typeof CATEGORY_COLORS] ?? "#64748b";
        const IconComponent = ICON_MAP[nodeData.icon] ?? Server;

        return (
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                        <IconComponent size={20} style={{ color }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">{nodeData.label}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {nodeData.provider} · {nodeData.category}
                        </p>
                    </div>
                </div>

                <Separator />

                {/* Description */}
                {catalogInfo && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Description</p>
                        <p className="text-xs text-foreground/80">{catalogInfo.description}</p>
                    </div>
                )}

                {/* Label edit */}
                <div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Label</p>
                    <Input
                        value={nodeData.label}
                        onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                        className="h-8 text-xs"
                    />
                </div>

                {/* Tags */}
                <div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Tags</p>
                    <div className="flex flex-wrap gap-1">
                        {nodeData.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Scoring hints */}
                {catalogInfo && (
                    <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-[10px] text-muted-foreground">Complexity</p>
                                <p className="text-sm font-medium">{catalogInfo.complexityHint}/5</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                                <p className="text-[10px] text-muted-foreground">Est. Cost</p>
                                <p className="text-sm font-medium">{catalogInfo.costHint}</p>
                            </div>
                        </div>
                    </>
                )}

                {/* Capabilities */}
                {catalogInfo && catalogInfo.capabilities.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Capabilities</p>
                        <div className="flex flex-wrap gap-1">
                            {catalogInfo.capabilities.map((cap) => (
                                <Badge key={cap} variant="outline" className="text-[9px]">
                                    {cap.replace(/_/g, " ")}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (selectedEdge) {
        const edgeData = selectedEdge.data as {
            relationshipType?: string;
            protocol?: string;
        } | undefined;

        return (
            <div className="p-4 space-y-4">
                <h3 className="text-sm font-semibold">Edge Connection</h3>
                <Separator />
                <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Relationship</p>
                    <p className="text-sm">{edgeData?.relationshipType ?? "invokes"}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Protocol</p>
                    <p className="text-sm">{edgeData?.protocol ?? "RPC"}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Source → Target</p>
                    <p className="text-xs text-muted-foreground">
                        {selectedEdge.source} → {selectedEdge.target}
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
