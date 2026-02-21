import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

  projects: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    ideaPrompt: v.optional(v.string()),
    constraints: v.optional(
      v.object({
        budgetLevel: v.optional(v.string()),
        teamSize: v.optional(v.string()),
        timeline: v.optional(v.string()),
        trafficExpectation: v.optional(v.string()),
        dataSensitivity: v.optional(v.string()),
        regionCount: v.optional(v.string()),
        uptimeTarget: v.optional(v.string()),
        devExperiencePreference: v.optional(v.string()),
        providerPreferences: v.optional(v.array(v.string())),
      })
    ),
    graph: v.optional(
      v.object({
        nodes: v.array(v.any()),
        edges: v.array(v.any()),
      })
    ),
    scores: v.optional(v.any()),
    lintIssues: v.optional(v.array(v.any())),
    createdAt: v.number(),
    updatedAt: v.number(),
    archived: v.optional(v.boolean()),
  }).index("by_ownerId", ["ownerId"]),

  projectVersions: defineTable({
    projectId: v.id("projects"),
    versionNumber: v.number(),
    graph: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
    }),
    features: v.optional(v.array(v.any())),
    scores: v.optional(v.any()),
    lintIssues: v.optional(v.array(v.any())),
    generationMeta: v.optional(
      v.object({
        source: v.string(),
        assumptions: v.optional(v.array(v.string())),
        strategy: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_versionNumber", ["projectId", "versionNumber"]),

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

  assistantThreads: defineTable({
    projectId: v.id("projects"),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        createdAt: v.number(),
      })
    ),
    createdAt: v.number(),
  }).index("by_projectId", ["projectId"]),
});
