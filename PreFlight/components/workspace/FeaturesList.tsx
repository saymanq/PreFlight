"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Trash2,
    GripVertical,
    CheckCircle2,
    Circle,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Loader2,
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
    must: "#ef4444",
    should: "#f59e0b",
    could: "#3b82f6",
    wont: "#6b7280",
};

const PRIORITY_LABELS: Record<string, string> = {
    must: "Must Have",
    should: "Should Have",
    could: "Could Have",
    wont: "Won't Have",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    planned: <Circle className="h-3 w-3 text-muted-foreground" />,
    in_progress: <AlertCircle className="h-3 w-3 text-yellow-400" />,
    done: <CheckCircle2 className="h-3 w-3 text-green-400" />,
};

interface FeatureItemProps {
    feature: {
        _id: string;
        title: string;
        description?: string;
        priority: string;
        status: string;
        estimatedComplexity?: string;
        architectureImpact?: string[];
    };
    onDelete: (id: string) => void;
}

function FeatureItem({ feature, onDelete }: FeatureItemProps) {
    const [expanded, setExpanded] = useState(false);
    const updateFeature = useMutation(api.features.update);

    const handleStatusChange = async (newStatus: string) => {
        await updateFeature({
            featureId: feature._id as Id<"featurePlans">,
            status: newStatus,
        });
    };

    const handlePriorityChange = async (newPriority: string) => {
        await updateFeature({
            featureId: feature._id as Id<"featurePlans">,
            priority: newPriority,
        });
    };

    return (
        <div className="group rounded-lg border border-border/50 hover:border-border transition-colors">
            <div
                className="flex items-center gap-2 p-2.5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                {expanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: PRIORITY_COLORS[feature.priority] }}
                />
                <span className="text-xs font-medium flex-1 truncate">{feature.title}</span>
                {STATUS_ICONS[feature.status]}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(feature._id);
                    }}
                >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
            </div>

            {expanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-2">
                    {feature.description && (
                        <p className="text-[10px] text-muted-foreground">{feature.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                        <Select value={feature.priority} onValueChange={handlePriorityChange}>
                            <SelectTrigger className="h-6 text-[10px] w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key} className="text-xs">
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={feature.status} onValueChange={handleStatusChange}>
                            <SelectTrigger className="h-6 text-[10px] w-28">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="planned" className="text-xs">Planned</SelectItem>
                                <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                                <SelectItem value="done" className="text-xs">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {feature.architectureImpact && feature.architectureImpact.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {feature.architectureImpact.map((impact, i) => (
                                <Badge key={i} variant="secondary" className="text-[8px]">
                                    {impact}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function FeaturesList({ projectId }: { projectId: string }) {
    const features = useQuery(api.features.listByProject, {
        projectId: projectId as Id<"projects">,
    });
    const createFeature = useMutation(api.features.create);
    const deleteFeature = useMutation(api.features.remove);
    const [newTitle, setNewTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!newTitle.trim()) return;
        setIsAdding(true);
        try {
            await createFeature({
                projectId: projectId as Id<"projects">,
                title: newTitle,
                priority: "should",
            });
            setNewTitle("");
        } catch (err) {
            console.error(err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteFeature({ featureId: id as Id<"featurePlans"> });
        } catch (err) {
            console.error(err);
        }
    };

    const featuresList = features ?? [];
    const must = featuresList.filter((f: any) => f.priority === "must");
    const should = featuresList.filter((f: any) => f.priority === "should");
    const could = featuresList.filter((f: any) => f.priority === "could");
    const wont = featuresList.filter((f: any) => f.priority === "wont");

    return (
        <div className="flex flex-col h-full">
            {/* Add feature input */}
            <div className="px-3 py-2 border-b border-border/30">
                <div className="flex gap-1.5">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Add a feature..."
                        className="h-7 text-xs flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <Button
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleAdd}
                        disabled={!newTitle.trim() || isAdding}
                    >
                        {isAdding ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Plus className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                    {featuresList.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-xs text-muted-foreground">No features yet.</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Add features to plan your architecture per feature.
                            </p>
                        </div>
                    )}

                    {[
                        { label: "Must Have", items: must, color: PRIORITY_COLORS.must },
                        { label: "Should Have", items: should, color: PRIORITY_COLORS.should },
                        { label: "Could Have", items: could, color: PRIORITY_COLORS.could },
                        { label: "Won't Have", items: wont, color: PRIORITY_COLORS.wont },
                    ].map(({ label, items, color }) =>
                        items.length > 0 ? (
                            <div key={label}>
                                <p
                                    className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1"
                                    style={{ color }}
                                >
                                    {label} ({items.length})
                                </p>
                                <div className="space-y-1">
                                    {items.map((feature: any) => (
                                        <FeatureItem
                                            key={feature._id}
                                            feature={feature}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : null
                    )}
                </div>
            </ScrollArea>

            {/* Summary */}
            {featuresList.length > 0 && (
                <div className="px-3 py-2 border-t border-border/30 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                        {Object.entries(PRIORITY_COLORS).map(([key, color]) => {
                            const count = featuresList.filter((f: any) => f.priority === key).length;
                            if (count === 0) return null;
                            return (
                                <Badge
                                    key={key}
                                    variant="secondary"
                                    className="text-[8px] gap-0.5"
                                    style={{ borderColor: `${color}40` }}
                                >
                                    <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                                    {count}
                                </Badge>
                            );
                        })}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{featuresList.length} total</span>
                </div>
            )}
        </div>
    );
}
