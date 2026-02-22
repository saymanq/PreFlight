import { createAzure } from "@ai-sdk/azure";

function normalizeAzureBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed.slice(0, -3) : trimmed;
}

const AZURE_OPENAI_API_KEY_GPT_5_MINI = process.env["AZURE_OPENAI_API_KEY_GPT_5_MINI"];
const AZURE_OPENAI_ENDPOINT_GPT_5_MINI = process.env["AZURE_OPENAI_ENDPOINT_GPT_5_MINI"];

const azureGpt5Mini =
  AZURE_OPENAI_API_KEY_GPT_5_MINI && AZURE_OPENAI_ENDPOINT_GPT_5_MINI
    ? createAzure({
        apiKey: AZURE_OPENAI_API_KEY_GPT_5_MINI,
        baseURL: normalizeAzureBaseUrl(AZURE_OPENAI_ENDPOINT_GPT_5_MINI),
      })
    : null;

export function getPrimaryTextModel() {
  if (!azureGpt5Mini) {
    throw new Error(
      "Missing Azure OpenAI configuration. Set AZURE_OPENAI_API_KEY_GPT_5_MINI and AZURE_OPENAI_ENDPOINT_GPT_5_MINI."
    );
  }
  return azureGpt5Mini.responses("gpt-5-mini");
}

export const LOW_REASONING_PROVIDER_OPTIONS = {
  azure: {
    reasoningEffort: "low" as const,
    textVerbosity: "low" as const,
  },
};

export const FAST_OUTPUT_TOKENS = {
  ideation: 3200,
  ideationRetry: 6400,
  workspace: 2800,
  workspaceRetry: 6400,
  architectureGenerate: 3200,
  chatStream: 2500,
  ideaStream: 2500,
  exportPack: 6000,
} as const;
