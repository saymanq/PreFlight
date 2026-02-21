import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByProject = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("featurePlans")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

export const create = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.string(),
        description: v.optional(v.string()),
        priority: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("featurePlans", {
            projectId: args.projectId,
            name: args.title,
            description: args.description,
            priority: priorityToNumber(args.priority ?? "should"),
            status: "planned",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const update = mutation({
    args: {
        featureId: v.id("featurePlans"),
        name: v.optional(v.string()),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        priority: v.optional(v.string()),
        status: v.optional(v.string()),
        dependencies: v.optional(v.array(v.string())),
        acceptanceCriteria: v.optional(v.array(v.string())),
        architectureDiff: v.optional(v.any()),
        buildPlan: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const { featureId, priority, ...rest } = args;
        const updates: Record<string, unknown> = { updatedAt: Date.now() };
        for (const [key, val] of Object.entries(rest)) {
            if (val !== undefined) updates[key] = val;
        }
        if (priority !== undefined) {
            updates.priority = priorityToNumber(priority);
        }
        await ctx.db.patch(featureId, updates);
    },
});

export const remove = mutation({
    args: { featureId: v.id("featurePlans") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.featureId);
    },
});

function priorityToNumber(p: string): number {
    switch (p) {
        case "must": return 0;
        case "should": return 1;
        case "could": return 2;
        case "wont": return 3;
        default: return 1;
    }
}
