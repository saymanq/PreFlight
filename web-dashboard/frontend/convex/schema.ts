import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ideaPrompt: v.optional(v.string()),
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
    graph: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
    }),
    scores: v.optional(v.any()),
    lintIssues: v.optional(v.array(v.any())),
    nodeCount: v.number(),
    overallScore: v.optional(v.number()),
    lintErrorCount: v.number(),
    lintWarningCount: v.number(),
    archived: v.boolean(),
  }).index("by_archived", ["archived"]),

  chatSessions: defineTable({
    sessionType: v.string(),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
  }).index("by_type", ["sessionType"]),

  sandboxes: defineTable({
    sandboxId: v.string(),
    projectName: v.string(),
    description: v.optional(v.string()),
    architectureJson: v.any(),
    techStack: v.array(v.string()),
    totalCost: v.number(),
    isPublic: v.boolean(),
    views: v.number(),
  }).index("by_sandboxId", ["sandboxId"])
    .index("by_public", ["isPublic"]),
});
