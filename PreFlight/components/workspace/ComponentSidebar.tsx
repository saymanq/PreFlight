"use client";

import React, { DragEvent } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    COMPONENT_CATALOG,
    CATEGORY_ORDER,
    CATEGORY_LABELS,
    CATEGORY_COLORS,
    type ComponentDef,
    type ComponentCategory,
} from "@/lib/component-catalog";
import { useWorkspaceStore } from "@/lib/store";
import {
    Globe, Monitor, Smartphone, Server, Network, Cog, ExternalLink,
    Database, Zap, Layers, Shield, Lock, HardDrive, Brain, ShieldCheck,
    List, Clock, BarChart3, Activity, Search, ChevronRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
    Globe, Monitor, Smartphone, Server, Network, Cog, ExternalLink,
    Database, Zap, Layers, Shield, Lock, HardDrive, Brain, ShieldCheck,
    List, Clock, BarChart3, Activity,
};

function ComponentItem({ component }: { component: ComponentDef }) {
    const IconComponent = ICON_MAP[component.icon] ?? Server;
    const color = CATEGORY_COLORS[component.category];

    const onDragStart = (event: DragEvent) => {
        event.dataTransfer.setData("application/preflight-component", component.type);
        event.dataTransfer.effectAllowed = "move";
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors group"
        >
            <div
                className="p-1.5 rounded-md shrink-0"
                style={{ backgroundColor: `${color}15` }}
            >
                <IconComponent size={16} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                    {component.label}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                    {component.provider}
                </p>
            </div>
            <Badge variant="secondary" className="text-[9px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {component.costHint}
            </Badge>
        </div>
    );
}

import { FeaturesList } from "@/components/workspace/FeaturesList";

const INITIAL_EXPANDED_CATEGORIES = CATEGORY_ORDER.reduce((acc, category, index) => {
    acc[category] = index === 0;
    return acc;
}, {} as Record<ComponentCategory, boolean>);

export function ComponentSidebar({ projectId }: { projectId: string }) {
    const { leftSidebarTab, setLeftSidebarTab } = useWorkspaceStore();
    const [search, setSearch] = React.useState("");
    const [expandedCategories, setExpandedCategories] = React.useState<Record<ComponentCategory, boolean>>(
        INITIAL_EXPANDED_CATEGORIES
    );

    const searchQuery = search.trim().toLowerCase();

    const filteredComponents = COMPONENT_CATALOG.filter(
        (c) =>
            c.label.toLowerCase().includes(searchQuery) ||
            c.provider.toLowerCase().includes(searchQuery) ||
            c.tags.some((t) => t.toLowerCase().includes(searchQuery)) ||
            c.capabilities.some((cap) => cap.toLowerCase().includes(searchQuery)) ||
            c.subcategory?.toLowerCase().includes(searchQuery)
    );

    const toggleCategory = (category: ComponentCategory) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    return (
        <div className="w-[260px] border-r border-border bg-card/50 flex flex-col h-full min-h-0">
            <Tabs
                value={leftSidebarTab}
                onValueChange={(v) => setLeftSidebarTab(v as "components" | "features")}
                className="flex flex-col h-full min-h-0"
            >
                <div className="px-3 pt-3 pb-2 border-b border-border">
                    <TabsList className="w-full grid grid-cols-2 h-8">
                        <TabsTrigger value="components" className="text-xs">Components</TabsTrigger>
                        <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="components" className="flex-1 min-h-0 flex flex-col mt-0 overflow-hidden">
                    <div className="px-3 py-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search components..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 pl-8 text-xs"
                            />
                        </div>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="px-3 pb-3 space-y-4">
                            {CATEGORY_ORDER.map((cat) => {
                                const items = filteredComponents.filter((c) => c.category === cat);
                                if (items.length === 0) return null;
                                const isExpanded = searchQuery.length > 0 || expandedCategories[cat];

                                const grouped = items.reduce<Record<string, ComponentDef[]>>((acc, component) => {
                                    const key = component.subcategory ?? "General";
                                    if (!acc[key]) acc[key] = [];
                                    acc[key].push(component);
                                    return acc;
                                }, {});

                                return (
                                    <div key={cat} className="border border-border/60 rounded-lg overflow-hidden bg-background/40">
                                        <button
                                            type="button"
                                            onClick={() => toggleCategory(cat)}
                                            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-accent/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <ChevronRight
                                                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""
                                                        }`}
                                                />
                                                <p
                                                    className="text-[10px] font-semibold uppercase tracking-wider truncate"
                                                    style={{ color: CATEGORY_COLORS[cat] }}
                                                >
                                                    {CATEGORY_LABELS[cat]}
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="text-[9px] h-5 px-1.5 shrink-0">
                                                {items.length}
                                            </Badge>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-2.5 pb-2 space-y-2">
                                                {Object.entries(grouped).map(([group, groupItems]) => (
                                                    <div key={group}>
                                                        <p className="text-[10px] text-muted-foreground px-1 mb-1">
                                                            {group}
                                                        </p>
                                                        <div className="space-y-0.5">
                                                            {groupItems.map((component) => (
                                                                <ComponentItem key={component.type} component={component} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="features" className="flex-1 min-h-0 mt-0 overflow-hidden">
                    <FeaturesList projectId={projectId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
