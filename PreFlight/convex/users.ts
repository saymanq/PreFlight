import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getOrCreate = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null; // Not yet authenticated — Convex will retry when token arrives

        const existing = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, { lastSeenAt: Date.now() });
            return existing._id;
        }

        return await ctx.db.insert("users", {
            externalId: identity.subject,
            email: identity.email ?? "",
            name: identity.name ?? "Anonymous",
            imageUrl: identity.pictureUrl,
            createdAt: Date.now(),
            lastSeenAt: Date.now(),
        });
    },
});

export const getCurrent = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
            .unique();
    },
});
