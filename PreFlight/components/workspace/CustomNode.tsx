"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CATEGORY_COLORS } from "@/lib/component-catalog";
import { useWorkspaceStore } from "@/lib/store";
import {
    Globe, Monitor, Smartphone, Server, Network, Cog, ExternalLink,
    Database, Zap, Layers, Shield, Lock, HardDrive, Brain, ShieldCheck,
    List, Clock, BarChart3, Activity,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
    Globe, Monitor, Smartphone, Server, Network, Cog, ExternalLink,
    Database, Zap, Layers, Shield, Lock, HardDrive, Brain, ShieldCheck,
    List, Clock, BarChart3, Activity,
};

function CustomNodeInner({ id, data, selected }: NodeProps) {
    const nodeData = data as {
        type: string;
        category: string;
        label: string;
        provider: string;
        icon: string;
        config: Record<string, unknown>;
        tags: string[];
    };

    const categoryColor = CATEGORY_COLORS[nodeData.category as keyof typeof CATEGORY_COLORS] ?? "#64748b";
    const IconComponent = ICON_MAP[nodeData.icon] ?? Server;

    return (
        <div
            className={`
        relative px-4 py-3 rounded-xl border min-w-[180px]
        transition-all duration-200
        ${selected ? "node-glow" : ""}
      `}
            style={{
                background: "oklch(0.16 0.006 285.885 / 90%)",
                borderColor: selected ? categoryColor : "oklch(1 0 0 / 12%)",
                backdropFilter: "blur(8px)",
            }}
        >
            {/* Category indicator strip */}
            <div
                className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                style={{ backgroundColor: categoryColor }}
            />

            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !border-2 !rounded-full"
                style={{
                    background: "oklch(0.22 0.006 286.033)",
                    borderColor: categoryColor,
                }}
            />

            <div className="flex items-center gap-3">
                <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${categoryColor}20` }}
                >
                    <IconComponent
                        size={18}
                        style={{ color: categoryColor }}
                    />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground leading-tight">
                        {nodeData.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {nodeData.provider}
                    </span>
                </div>
            </div>

            {nodeData.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                    {nodeData.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !border-2 !rounded-full"
                style={{
                    background: "oklch(0.22 0.006 286.033)",
                    borderColor: categoryColor,
                }}
            />
        </div>
    );
}

export const CustomNode = memo(CustomNodeInner);
