"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";

interface Constraints {
    budgetLevel?: string;
    teamSize?: string;
    timeline?: string;
    trafficExpectation?: string;
    dataSensitivity?: string;
    regionCount?: string;
    uptimeTarget?: string;
    devExperiencePreference?: string;
}

interface ConstraintsBarProps {
    constraints: Constraints;
    onUpdate: (constraints: Constraints) => void;
}

const CONSTRAINT_LABELS: Record<string, string> = {
    budgetLevel: "Budget",
    teamSize: "Team",
    timeline: "Timeline",
    trafficExpectation: "Traffic",
    dataSensitivity: "Data Sensitivity",
    regionCount: "Regions",
    uptimeTarget: "Uptime",
    devExperiencePreference: "DX Priority",
};

const CONSTRAINT_OPTIONS: Record<string, { value: string; label: string }[]> = {
    budgetLevel: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
    ],
    teamSize: [
        { value: "1", label: "Solo (1)" },
        { value: "2-3", label: "Small (2-3)" },
        { value: "4+", label: "Team (4+)" },
    ],
    timeline: [
        { value: "hackathon", label: "Hackathon" },
        { value: "1_month", label: "1 Month" },
        { value: "3_months", label: "3+ Months" },
    ],
    trafficExpectation: [
        { value: "low", label: "Low (<1k)" },
        { value: "medium", label: "Medium (1k-50k)" },
        { value: "high", label: "High (50k+)" },
    ],
    dataSensitivity: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
    ],
    regionCount: [
        { value: "1", label: "Single" },
        { value: "2-3", label: "Multi (2-3)" },
        { value: "global", label: "Global" },
    ],
    uptimeTarget: [
        { value: "99", label: "99%" },
        { value: "99.9", label: "99.9%" },
        { value: "99.99", label: "99.99%" },
    ],
    devExperiencePreference: [
        { value: "fastest_mvp", label: "Fastest MVP" },
        { value: "balanced", label: "Balanced" },
        { value: "scale_ready", label: "Scale-Ready" },
    ],
};

export function ConstraintsBar({ constraints, onUpdate }: ConstraintsBarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [local, setLocal] = useState<Constraints>(constraints);

    const handleSave = () => {
        onUpdate(local);
        setIsOpen(false);
    };

    const visibleConstraints = [
        { key: "budgetLevel", value: constraints.budgetLevel },
        { key: "teamSize", value: constraints.teamSize },
        { key: "timeline", value: constraints.timeline },
        { key: "trafficExpectation", value: constraints.trafficExpectation },
        { key: "devExperiencePreference", value: constraints.devExperiencePreference },
    ].filter((c) => c.value);

    return (
        <div className="h-10 border-t border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-2">
            <span className="text-[10px] font-medium text-muted-foreground shrink-0">Constraints:</span>
            <div className="flex gap-1.5 flex-1 overflow-x-auto">
                {visibleConstraints.map(({ key, value }) => (
                    <Badge key={key} variant="secondary" className="text-[10px] shrink-0">
                        {CONSTRAINT_LABELS[key]}: {value}
                    </Badge>
                ))}
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 shrink-0"
                        onClick={() => setLocal(constraints)}
                    >
                        <Settings2 className="h-3 w-3" />
                        Edit
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Project Constraints</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {Object.entries(CONSTRAINT_OPTIONS).map(([key, options]) => (
                            <div key={key}>
                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                    {CONSTRAINT_LABELS[key]}
                                </label>
                                <Select
                                    value={(local as Record<string, string>)[key] ?? ""}
                                    onValueChange={(v) =>
                                        setLocal((prev) => ({ ...prev, [key]: v }))
                                    }
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                            Apply
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
