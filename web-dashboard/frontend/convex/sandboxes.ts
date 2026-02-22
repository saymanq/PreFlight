import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const publish = mutation({
  args: {
    projectName: v.string(),
    description: v.optional(v.string()),
    architectureJson: v.any(),
    techStack: v.array(v.string()),
    totalCost: v.number(),
  },
  handler: async (ctx, args) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let sandboxId = "";
    for (let i = 0; i < 8; i++) {
      sandboxId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const id = await ctx.db.insert("sandboxes", {
      sandboxId,
      projectName: args.projectName,
      description: args.description,
      architectureJson: args.architectureJson,
      techStack: args.techStack,
      totalCost: args.totalCost,
      isPublic: true,
      views: 0,
    });
    return { _id: id, sandboxId };
  },
});

export const get = query({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sandboxes")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
  },
});

export const incrementViews = mutation({
  args: { sandboxId: v.string() },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db
      .query("sandboxes")
      .withIndex("by_sandboxId", (q) => q.eq("sandboxId", args.sandboxId))
      .first();
    if (sandbox) {
      await ctx.db.patch(sandbox._id, { views: sandbox.views + 1 });
    }
  },
});

export const list = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let results = await ctx.db
      .query("sandboxes")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(limit);

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((s) =>
        s.projectName.toLowerCase().includes(searchLower)
      );
    }

    return results;
  },
});
