import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const constraintsValidator = v.object({
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
});

const partialConstraintsValidator = v.object({
  budgetLevel: v.optional(v.string()),
  teamSize: v.optional(v.number()),
  timeline: v.optional(v.string()),
  trafficExpectation: v.optional(v.string()),
  dataVolume: v.optional(v.string()),
  uptimeTarget: v.optional(v.number()),
  regionCount: v.optional(v.number()),
  devExperienceGoal: v.optional(v.string()),
  dataSensitivity: v.optional(v.string()),
  preferredProviders: v.optional(v.array(v.string())),
  avoidProviders: v.optional(v.array(v.string())),
});

const graphValidator = v.object({
  nodes: v.array(v.any()),
  edges: v.array(v.any()),
});

const messageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  createdAt: v.number(),
});

const DEFAULT_CONSTRAINTS = {
  budgetLevel: "medium",
  teamSize: 2,
  timeline: "1month",
  trafficExpectation: "medium",
  dataVolume: "medium",
  uptimeTarget: 99,
  regionCount: 1,
  devExperienceGoal: "balanced",
  dataSensitivity: "low",
  preferredProviders: [] as string[],
  avoidProviders: [] as string[],
};

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

async function assertProjectOwnership(ctx: any, projectId: any, ownerId: any) {
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Project not found");
  if (project.ownerId !== ownerId) throw new Error("Not authorized");
  return project;
}

export const createFromIdeation = mutation({
  args: {
    threadId: v.id("chatThreads"),
    selectedComponentIds: v.array(v.string()),
    graph: graphValidator,
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    constraints: v.optional(constraintsValidator),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Ideation thread not found");
    if (thread.ownerId !== user._id) throw new Error("Not authorized");
    if (thread.threadType !== "ideation") {
      throw new Error("Thread is not an ideation thread");
    }

    const now = Date.now();
    const name = args.name?.trim() || thread.title || "My Architecture";

    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name,
      description: args.description?.trim() || undefined,
      constraints: args.constraints ?? DEFAULT_CONSTRAINTS,
      graph: args.graph,
      nodeCount: args.graph.nodes.length,
      overallScore: undefined,
      scores: undefined,
      lintIssues: [],
      lintErrorCount: 0,
      lintWarningCount: 0,
      sourceIdeationThreadId: thread._id,
      sourceIdeationSnapshot: thread.messages,
      selectedComponentIds: args.selectedComponentIds,
      createdAt: now,
      updatedAt: now,
      archived: false,
    });

    await ctx.db.patch(args.threadId, {
      updatedAt: now,
    });

    return projectId;
  },
});

export const listByOwner = query({
  args: {
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentity(ctx);
    if (!user) return [];

    const archived = args.archived ?? false;

    return await ctx.db
      .query("projects")
      .withIndex("by_owner_archived", (q) =>
        q.eq("ownerId", user._id).eq("archived", archived)
      )
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentity(ctx);
    if (!user) throw new Error("Not authenticated");

    return await assertProjectOwnership(ctx, args.projectId, user._id);
  },
});

export const updateGraph = mutation({
  args: {
    projectId: v.id("projects"),
    graph: graphValidator,
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.projectId, user._id);

    await ctx.db.patch(args.projectId, {
      graph: args.graph,
      nodeCount: args.graph.nodes.length,
      updatedAt: Date.now(),
    });
  },
});

export const updateConstraints = mutation({
  args: {
    projectId: v.id("projects"),
    constraints: partialConstraintsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    const project = await assertProjectOwnership(ctx, args.projectId, user._id);

    const nextConstraints = {
      ...(project.constraints ?? DEFAULT_CONSTRAINTS),
      ...args.constraints,
    };

    await ctx.db.patch(args.projectId, {
      constraints: nextConstraints,
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
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.projectId, user._id);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined && args.name.trim().length > 0) {
      patch.name = args.name.trim();
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined;
    }

    await ctx.db.patch(args.projectId, patch);
  },
});

export const saveScoresAndLint = mutation({
  args: {
    projectId: v.id("projects"),
    scores: v.optional(v.any()),
    lintIssues: v.optional(v.array(v.any())),
    overallScore: v.optional(v.number()),
    lintErrorCount: v.optional(v.number()),
    lintWarningCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.projectId, user._id);

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.scores !== undefined) patch.scores = args.scores;
    if (args.lintIssues !== undefined) patch.lintIssues = args.lintIssues;
    if (args.overallScore !== undefined) patch.overallScore = args.overallScore;
    if (args.lintErrorCount !== undefined) patch.lintErrorCount = args.lintErrorCount;
    if (args.lintWarningCount !== undefined) patch.lintWarningCount = args.lintWarningCount;

    await ctx.db.patch(args.projectId, patch);
  },
});

export const archive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.projectId, user._id);

    await ctx.db.patch(args.projectId, {
      archived: true,
      updatedAt: Date.now(),
    });
  },
});

// Compatibility helpers for legacy callers until all pages are migrated.
export const list = listByOwner;

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ideaPrompt: v.optional(v.string()),
    graph: v.optional(graphValidator),
    constraints: v.optional(constraintsValidator),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("projects", {
      ownerId: user._id,
      name: args.name,
      description: args.description,
      constraints: args.constraints ?? DEFAULT_CONSTRAINTS,
      graph: args.graph ?? { nodes: [], edges: [] },
      nodeCount: args.graph?.nodes.length ?? 0,
      overallScore: undefined,
      scores: undefined,
      lintIssues: [],
      lintErrorCount: 0,
      lintWarningCount: 0,
      sourceIdeationSnapshot: args.ideaPrompt
        ? [{ role: "user", content: args.ideaPrompt, createdAt: now }]
        : [],
      selectedComponentIds: [],
      createdAt: now,
      updatedAt: now,
      archived: false,
    });
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getUserFromIdentity(ctx);
    if (!user) return null;
    return await assertProjectOwnership(ctx, args.id, user._id);
  },
});

export const updateGraphLegacy = mutation({
  args: { id: v.id("projects"), graph: graphValidator },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.id, user._id);
    await ctx.db.patch(args.id, {
      graph: args.graph,
      nodeCount: args.graph.nodes.length,
      updatedAt: Date.now(),
    });
  },
});

export const updateConstraintsLegacy = mutation({
  args: { id: v.id("projects"), constraints: partialConstraintsValidator },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    const project = await assertProjectOwnership(ctx, args.id, user._id);
    const nextConstraints = {
      ...(project.constraints ?? DEFAULT_CONSTRAINTS),
      ...args.constraints,
    };
    await ctx.db.patch(args.id, {
      constraints: nextConstraints,
      updatedAt: Date.now(),
    });
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
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.id, user._id);
    await ctx.db.patch(args.id, {
      scores: args.scores,
      lintIssues: args.lintIssues,
      overallScore: args.overallScore,
      lintErrorCount: args.lintErrorCount ?? 0,
      lintWarningCount: args.lintWarningCount ?? 0,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.projectId, user._id);
    await ctx.db.patch(args.projectId, {
      archived: true,
      updatedAt: Date.now(),
    });
  },
});

export const saveChatHistory = mutation({
  args: {
    projectId: v.id("projects"),
    messages: v.array(messageValidator),
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.projectId, user._id);

    await ctx.db.patch(args.projectId, {
      sourceIdeationSnapshot: args.messages,
      updatedAt: Date.now(),
    });
  },
});

export const saveGraph = mutation({
  args: {
    projectId: v.id("projects"),
    graph: graphValidator,
  },
  handler: async (ctx, args) => {
    const user = await getOrCreateUser(ctx);
    await assertProjectOwnership(ctx, args.projectId, user._id);
    await ctx.db.patch(args.projectId, {
      graph: args.graph,
      nodeCount: args.graph.nodes.length,
      updatedAt: Date.now(),
    });
  },
});

export const listVersions = query({
  args: { projectId: v.id("projects") },
  handler: async (_ctx, _args) => {
    return [];
  },
});

export const createVersionSnapshot = mutation({
  args: { projectId: v.id("projects") },
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const getAssistantThread = query({
  args: { projectId: v.id("projects") },
  handler: async (_ctx, _args) => {
    return [];
  },
});

export const saveAssistantThread = mutation({
  args: {
    projectId: v.id("projects"),
    messages: v.array(messageValidator),
  },
  handler: async (_ctx, _args) => {
    return null;
  },
});

export const transitionToArchitecture = mutation({
  args: {
    projectId: v.id("projects"),
    extractedContext: v.object({
      appIdea: v.optional(v.string()),
      features: v.optional(v.array(v.string())),
      constraints: v.optional(v.any()),
    }),
  },
  handler: async (_ctx, args) => {
    return args.projectId;
  },
});
