export const LOW_REASONING_PROVIDER_OPTIONS = {
  google: {
    thinkingConfig: {
      thinkingLevel: "minimal" as const,
      includeThoughts: false,
    },
  },
};

export const FAST_OUTPUT_TOKENS = {
  ideation: 700,
  workspace: 700,
  architectureGenerate: 900,
  chatStream: 700,
  ideaStream: 700,
  exportPack: 1800,
} as const;
