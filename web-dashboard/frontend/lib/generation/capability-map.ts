export interface Capability {
  id: string;
  requiredNodeCategories: string[];
  optionalNodeCategories: string[];
  requiredEdgeTypes: string[];
}

export const FEATURE_TO_CAPABILITIES: Record<string, Capability[]> = {
  auth: [{ id: "user-auth", requiredNodeCategories: ["auth"], optionalNodeCategories: [], requiredEdgeTypes: ["authenticates"] }],
  chat: [
    { id: "messaging", requiredNodeCategories: ["database"], optionalNodeCategories: ["cache"], requiredEdgeTypes: ["reads", "writes"] },
    { id: "realtime-delivery", requiredNodeCategories: ["backend"], optionalNodeCategories: [], requiredEdgeTypes: ["subscribes"] },
  ],
  file_upload: [{ id: "file-storage", requiredNodeCategories: ["storage"], optionalNodeCategories: ["queue"], requiredEdgeTypes: ["uploads_to"] }],
  ai_chat: [{ id: "llm-integration", requiredNodeCategories: ["ml", "backend"], optionalNodeCategories: ["queue"], requiredEdgeTypes: ["invokes"] }],
  rag: [{ id: "embeddings-pipeline", requiredNodeCategories: ["ml", "database"], optionalNodeCategories: [], requiredEdgeTypes: ["invokes", "reads", "writes"] }],
  search: [{ id: "search-index", requiredNodeCategories: ["search"], optionalNodeCategories: [], requiredEdgeTypes: ["reads"] }],
  payments: [{ id: "payment-processing", requiredNodeCategories: ["backend"], optionalNodeCategories: [], requiredEdgeTypes: ["invokes"] }],
  notifications: [{ id: "notification-delivery", requiredNodeCategories: ["queue", "backend"], optionalNodeCategories: [], requiredEdgeTypes: ["queues"] }],
  analytics: [{ id: "event-tracking", requiredNodeCategories: ["monitoring"], optionalNodeCategories: ["database"], requiredEdgeTypes: ["writes"] }],
  realtime: [{ id: "realtime-sync", requiredNodeCategories: ["backend"], optionalNodeCategories: ["cache"], requiredEdgeTypes: ["subscribes"] }],
};

export function mapFeaturesToCapabilities(featureCategories: string[]): Capability[] {
  const caps: Capability[] = [];
  const seen = new Set<string>();
  for (const cat of featureCategories) {
    for (const cap of FEATURE_TO_CAPABILITIES[cat] || []) {
      if (!seen.has(cap.id)) { seen.add(cap.id); caps.push(cap); }
    }
  }
  return caps;
}
