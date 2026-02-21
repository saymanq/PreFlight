import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();

        if (!user) return [];

        return await ctx.db
            .query("projects")
            .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
            .collect();
    },
});

export const getById = query({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();

        if (!user || project.ownerId !== user._id) {
            throw new Error("Not authorized");
        }

        return project;
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        ideaPrompt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();

        if (!user) throw new Error("User not found");

        return await ctx.db.insert("projects", {
            ownerId: user._id,
            name: args.name,
            description: args.description,
            ideaPrompt: args.ideaPrompt,
            constraints: {
                budgetLevel: "medium",
                teamSize: "1",
                timeline: "hackathon",
                trafficExpectation: "low",
                dataSensitivity: "low",
                regionCount: "1",
                uptimeTarget: "99",
                devExperiencePreference: "fastest_mvp",
            },
            graph: { nodes: [], edges: [] },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

export const updateMeta = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: Record<string, unknown> = { updatedAt: Date.now() };
        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        await ctx.db.patch(args.projectId, updates);
    },
});

export const updateConstraints = mutation({
    args: {
        projectId: v.id("projects"),
        constraints: v.object({
            budgetLevel: v.optional(v.string()),
            teamSize: v.optional(v.string()),
            timeline: v.optional(v.string()),
            trafficExpectation: v.optional(v.string()),
            dataSensitivity: v.optional(v.string()),
            regionCount: v.optional(v.string()),
            uptimeTarget: v.optional(v.string()),
            devExperiencePreference: v.optional(v.string()),
            providerPreferences: v.optional(v.array(v.string())),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, {
            constraints: args.constraints,
            updatedAt: Date.now(),
        });
    },
});

export const saveGraph = mutation({
    args: {
        projectId: v.id("projects"),
        graph: v.object({
            nodes: v.array(v.any()),
            edges: v.array(v.any()),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, {
            graph: args.graph,
            updatedAt: Date.now(),
        });
    },
});

export const saveScoresAndLint = mutation({
    args: {
        projectId: v.id("projects"),
        scores: v.optional(v.any()),
        lintIssues: v.optional(v.array(v.any())),
    },
    handler: async (ctx, args) => {
        const updates: Record<string, unknown> = { updatedAt: Date.now() };
        if (args.scores !== undefined) updates.scores = args.scores;
        if (args.lintIssues !== undefined) updates.lintIssues = args.lintIssues;
        await ctx.db.patch(args.projectId, updates);
    },
});

export const createVersionSnapshot = mutation({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const project = await ctx.db.get(args.projectId);
        if (!project) throw new Error("Project not found");

        const existingVersions = await ctx.db
            .query("projectVersions")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();

        const versionNumber = existingVersions.length + 1;

        return await ctx.db.insert("projectVersions", {
            projectId: args.projectId,
            versionNumber,
            graph: project.graph ?? { nodes: [], edges: [] },
            scores: project.scores,
            lintIssues: project.lintIssues,
            generationMeta: {
                source: "manual",
            },
            createdAt: Date.now(),
        });
    },
});

export const remove = mutation({
    args: { projectId: v.id("projects") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, { archived: true, updatedAt: Date.now() });
    },
});
