import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const create = mutation({
  args: {
    sessionType: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("chatSessions", {
      sessionType: args.sessionType,
      messages: [],
    });
    return id;
  },
});

export const get = query({
  args: { id: v.id("chatSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: { sessionType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.sessionType) {
      return await ctx.db
        .query("chatSessions")
        .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("chatSessions").order("desc").collect();
  },
});

export const saveMessages = mutation({
  args: {
    id: v.id("chatSessions"),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { messages: args.messages });
  },
});

export const deleteSession = mutation({
  args: { id: v.id("chatSessions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
