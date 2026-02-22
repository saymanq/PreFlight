"use client";

import React from "react";
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from "@xyflow/react";

export function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const edgeData = data as { relationshipType?: string; protocol?: string } | undefined;

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    stroke: selected ? "#008000" : "oklch(0.4 0.01 285)",
                    strokeWidth: selected ? 2 : 1.5,
                    ...style,
                }}
            />
            {edgeData?.relationshipType && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: "all",
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium text-muted-foreground bg-card border border-border"
                    >
                        {edgeData.relationshipType}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
