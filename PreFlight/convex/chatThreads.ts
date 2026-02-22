import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_MESSAGES_PER_THREAD = 200;
const MAX_MESSAGE_CHARS = 12000;

async function getOrCreateUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const existing = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q: any) => q.eq("externalId", identity.subject))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, { lastSeenAt: Date.now() });
    return existing;
  }

  const userId = await ctx.db.insert("users", {
    externalId: identity.subject,
    email: identity.email ?? "",
    name: identity.name ?? "Anonymous",
    imageUrl: identity.pictureUrl,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  });

  const inserted = await ctx.db.get(userId);
  if (!inserted) throw new Error("Failed to create user");
  return inserted;
}

async function getUserFromIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q: any) => q.eq("externalId", identity.subject))
    .unique();
}

export const createIdeationThread = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    const now = Date.now();

    const title =
      args.title?.trim() ||
      `New idea ${new Date(now).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;

    return await ctx.db.insert("chatThreads", {
      ownerId: user._id,
      threadType: "ideation",
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
      archived: false,
    });
  },
});

export const listIdeationThreads = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentity(ctx);
    if (!user) return [];

    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_owner_type", (q) =>
        q.eq("ownerId", user._id).eq("threadType", "ideation")
      )
      .collect();

    return threads
      .filter((thread) => (args.includeArchived ? true : !thread.archived))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getThread = query({
  args: {
    threadId: v.id("chatThreads"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentity(ctx);
    if (!user) return null;

    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    if (thread.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    return thread;
  },
});

export const appendMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    const thread = await ctx.db.get(args.threadId);

    if (!thread) throw new Error("Thread not found");
    if (thread.ownerId !== user._id) throw new Error("Not authorized");
    if (thread.archived) throw new Error("Thread is archived");

    const normalizedContent = args.content.slice(0, MAX_MESSAGE_CHARS);
    if (!normalizedContent.trim()) {
      throw new Error("Message content is empty");
    }

    const message = {
      role: args.role,
      content: normalizedContent,
      createdAt: args.createdAt ?? Date.now(),
    };

    const nextMessages = [...thread.messages, message].slice(-MAX_MESSAGES_PER_THREAD);

    await ctx.db.patch(args.threadId, {
      messages: nextMessages,
      updatedAt: Date.now(),
    });

    return message;
  },
});

export const renameThread = mutation({
  args: {
    threadId: v.id("chatThreads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    const thread = await ctx.db.get(args.threadId);

    if (!thread) throw new Error("Thread not found");
    if (thread.ownerId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.threadId, {
      title: args.title.trim() || thread.title,
      updatedAt: Date.now(),
    });
  },
});

export const archiveThread = mutation({
  args: {
    threadId: v.id("chatThreads"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    const thread = await ctx.db.get(args.threadId);

    if (!thread) throw new Error("Thread not found");
    if (thread.ownerId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.threadId, {
      archived: true,
      updatedAt: Date.now(),
    });
  },
});

export const createWorkspaceThreadForProject = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Not authorized");

    const existing = await ctx.db
      .query("chatThreads")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const workspaceThread = existing.find(
      (thread) => thread.threadType === "workspace" && !thread.archived
    );

    if (workspaceThread) {
      return workspaceThread._id;
    }

    const now = Date.now();
    return await ctx.db.insert("chatThreads", {
      ownerId: user._id,
      threadType: "workspace",
      projectId: args.projectId,
      title: args.title?.trim() || `${project.name} Assistant`,
      messages: [],
      createdAt: now,
      updatedAt: now,
      archived: false,
    });
  },
});

export const getWorkspaceThreadByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentity(ctx);
    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    if (project.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    const threads = await ctx.db
      .query("chatThreads")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const workspaceThreads = threads
      .filter((thread) => thread.threadType === "workspace" && !thread.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return workspaceThreads[0] ?? null;
  },
});
