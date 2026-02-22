import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const messageSchema = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  createdAt: v.number(),
});

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_email", ["email"]),

  chatThreads: defineTable({
    ownerId: v.id("users"),
    threadType: v.union(v.literal("ideation"), v.literal("workspace")),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    messages: v.array(messageSchema),
    createdAt: v.number(),
    updatedAt: v.number(),
    archived: v.boolean(),
  })
    .index("by_owner_type", ["ownerId", "threadType"])
    .index("by_owner_updated", ["ownerId", "updatedAt"])
    .index("by_projectId", ["projectId"]),

  projects: defineTable({
    ownerId: v.optional(v.id("users")),
    name: v.string(),
    description: v.optional(v.string()),
    constraints: v.optional(v.object({
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
    })),
    graph: v.optional(v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
    })),
    scores: v.optional(v.any()),
    lintIssues: v.optional(v.array(v.any())),
    nodeCount: v.optional(v.number()),
    overallScore: v.optional(v.number()),
    lintErrorCount: v.optional(v.number()),
    lintWarningCount: v.optional(v.number()),
    sourceIdeationThreadId: v.optional(v.id("chatThreads")),
    sourceIdeationSnapshot: v.optional(v.array(messageSchema)),
    selectedComponentIds: v.optional(v.array(v.string())),
    ideaPrompt: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    archived: v.optional(v.boolean()),
  })
    .index("by_owner_archived", ["ownerId", "archived"])
    .index("by_owner_updated", ["ownerId", "updatedAt"]),

  featurePlans: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.number()),
    status: v.optional(v.string()),
    dependencies: v.optional(v.array(v.string())),
    acceptanceCriteria: v.optional(v.array(v.string())),
    architectureDiff: v.optional(v.any()),
    buildPlan: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_priority", ["projectId", "priority"]),
});
