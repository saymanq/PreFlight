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
        name: v.string(),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        priority: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("featurePlans", {
            projectId: args.projectId,
            name: args.name,
            category: args.category,
            description: args.description,
            priority: args.priority ?? 0,
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
        priority: v.optional(v.number()),
        status: v.optional(v.string()),
        dependencies: v.optional(v.array(v.string())),
        acceptanceCriteria: v.optional(v.array(v.string())),
        architectureDiff: v.optional(v.any()),
        buildPlan: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const { featureId, ...updates } = args;
        const filtered: Record<string, unknown> = { updatedAt: Date.now() };
        for (const [key, val] of Object.entries(updates)) {
            if (val !== undefined) filtered[key] = val;
        }
        await ctx.db.patch(featureId, filtered);
    },
});

export const remove = mutation({
    args: { featureId: v.id("featurePlans") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.featureId);
    },
});
