import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const DEFAULT_CONSTRAINTS = {
  budgetLevel: "medium",
  teamSize: 2,
  timeline: "1month",
  trafficExpectation: "medium",
  dataVolume: "medium",
  uptimeTarget: 99.0,
  regionCount: 1,
  devExperienceGoal: "balanced",
  dataSensitivity: "low",
  preferredProviders: [] as string[],
  avoidProviders: [] as string[],
};

export const list = query({
  args: { archived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const archived = args.archived ?? false;
    return await ctx.db
      .query("projects")
      .withIndex("by_archived", (q) => q.eq("archived", archived))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ideaPrompt: v.optional(v.string()),
    constraints: v.optional(
      v.object({
        budgetLevel: v.string(),
        teamSize: v.number(),
        timeline: v.string(),
        trafficExpectation: v.string(),
        dataVolume: v.string(),
        uptimeTarget: v.number(),
        regionCount: v.number(),
        devExperienceGoal: v.string(),
        dataSensitivity: v.string(),
        preferredProviders: v.array(v.string()),
        avoidProviders: v.array(v.string()),
      })
    ),
    graph: v.optional(
      v.object({
        nodes: v.array(v.any()),
        edges: v.array(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const graph = args.graph ?? { nodes: [], edges: [] };
    const id = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      ideaPrompt: args.ideaPrompt,
      constraints: args.constraints ?? DEFAULT_CONSTRAINTS,
      graph,
      nodeCount: graph.nodes.length,
      overallScore: undefined,
      scores: undefined,
      lintIssues: [],
      lintErrorCount: 0,
      lintWarningCount: 0,
      archived: false,
    });
    return id;
  },
});

export const updateGraph = mutation({
  args: {
    id: v.id("projects"),
    graph: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      graph: args.graph,
      nodeCount: args.graph.nodes.length,
    });
  },
});

export const updateConstraints = mutation({
  args: {
    id: v.id("projects"),
    constraints: v.object({
      budgetLevel: v.string(),
      teamSize: v.number(),
      timeline: v.string(),
      trafficExpectation: v.string(),
      dataVolume: v.string(),
      uptimeTarget: v.number(),
      regionCount: v.number(),
      devExperienceGoal: v.string(),
      dataSensitivity: v.string(),
      preferredProviders: v.array(v.string()),
      avoidProviders: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { constraints: args.constraints });
  },
});

export const updateMeta = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, string> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch);
    }
  },
});

export const saveScores = mutation({
  args: {
    id: v.id("projects"),
    scores: v.optional(v.any()),
    lintIssues: v.optional(v.array(v.any())),
    overallScore: v.optional(v.number()),
    lintErrorCount: v.optional(v.number()),
    lintWarningCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      scores: args.scores,
      lintIssues: args.lintIssues ?? [],
      overallScore: args.overallScore,
      lintErrorCount: args.lintErrorCount ?? 0,
      lintWarningCount: args.lintWarningCount ?? 0,
    });
  },
});

export const archive = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { archived: true });
  },
});
