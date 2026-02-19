import type { ProviderDetection, ProviderModelSelectionMode } from "@/types";

export interface ProviderModelSelectInput {
  provider: ProviderDetection;
  modelPriority?: readonly string[];
  mode?: ProviderModelSelectionMode;
}

/**
 * Picks the best available provider model by ordered preference patterns.
 * Expects: provider models use provider/id format from providerModelsGet.
 */
export function providerModelSelect(
  input: ProviderModelSelectInput
): string | undefined {
  const provider = input.provider;
  const modelPriority = input.modelPriority;
  const models = provider.models ?? [];
  if (models.length === 0) {
    return undefined;
  }

  if (!modelPriority || modelPriority.length === 0) {
    return providerModelSelectFromStaticPriority(
      models.map((model) => model.id),
      input.mode ?? "codex-high"
    );
  }

  for (const candidate of modelPriority) {
    const resolved = models.find((model) => providerModelMatches(model.id, candidate));
    if (resolved) {
      return resolved.id;
    }
  }

  return providerModelSelectFromStaticPriority(
    models.map((model) => model.id),
    input.mode ?? "codex-high"
  );
}

function providerModelMatches(modelId: string, candidate: string): boolean {
  const modelIdNormalized = modelId.trim().toLowerCase();
  const candidateNormalized = candidate.trim().toLowerCase();
  if (!modelIdNormalized || !candidateNormalized) {
    return false;
  }

  if (providerModelMatchExact(modelIdNormalized, candidateNormalized)) {
    return true;
  }

  if (!candidateNormalized.includes("/") && modelIdNormalized.endsWith(`/${candidateNormalized}`)) {
    return true;
  }

  if (candidateNormalized.includes("*")) {
    return providerModelMatchGlob(modelIdNormalized, candidateNormalized);
  }

  return false;
}

function providerModelMatchExact(modelId: string, candidate: string): boolean {
  return modelId === candidate;
}

function providerModelMatchGlob(modelId: string, candidate: string): boolean {
  const pattern = candidate
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${pattern}$`, "i").test(modelId);
}

function providerModelSelectFromStaticPriority(
  availableModelIds: readonly string[],
  mode: ProviderModelSelectionMode
): string | undefined {
  const modePriority = providerModelPriorityByMode[mode];
  for (const candidate of modePriority) {
    const resolved = availableModelIds.find((id) => providerModelMatches(id, candidate));
    if (resolved) {
      return resolved;
    }
  }

  for (const candidate of providerModelCatalog) {
    const resolved = availableModelIds.find((id) => providerModelMatches(id, candidate));
    if (resolved) {
      return resolved;
    }
  }

  return [...availableModelIds].sort((a, b) => a.localeCompare(b))[0];
}

const providerModelCatalog = [
  "anthropic/claude-3-5-haiku-20241022",
  "anthropic/claude-3-5-haiku-latest",
  "anthropic/claude-3-5-sonnet-20240620",
  "anthropic/claude-3-5-sonnet-20241022",
  "anthropic/claude-3-7-sonnet-20250219",
  "anthropic/claude-3-7-sonnet-latest",
  "anthropic/claude-3-haiku-20240307",
  "anthropic/claude-3-opus-20240229",
  "anthropic/claude-3-sonnet-20240229",
  "anthropic/claude-haiku-4-5",
  "anthropic/claude-haiku-4-5-20251001",
  "anthropic/claude-opus-4-0",
  "anthropic/claude-opus-4-1",
  "anthropic/claude-opus-4-1-20250805",
  "anthropic/claude-opus-4-20250514",
  "anthropic/claude-opus-4-5",
  "anthropic/claude-opus-4-5-20251101",
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-0",
  "anthropic/claude-sonnet-4-20250514",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-sonnet-4-5-20250929",
  "anthropic/claude-sonnet-4-6",
  "google-antigravity/claude-opus-4-5-thinking",
  "google-antigravity/claude-sonnet-4-5",
  "google-antigravity/claude-sonnet-4-5-thinking",
  "google-antigravity/gemini-3-flash",
  "google-antigravity/gemini-3-pro-high",
  "google-antigravity/gemini-3-pro-low",
  "google-antigravity/gpt-oss-120b-medium",
  "openai-codex/gpt-5.1",
  "openai-codex/gpt-5.1-codex-max",
  "openai-codex/gpt-5.1-codex-mini",
  "openai-codex/gpt-5.2",
  "openai-codex/gpt-5.2-codex",
  "openai-codex/gpt-5.3-codex",
  "openai-codex/gpt-5.3-codex-spark"
] as const;

const providerModelPriorityByMode: Record<
  ProviderModelSelectionMode,
  readonly (typeof providerModelCatalog)[number][]
> = {
  sonnet: [
    "anthropic/claude-sonnet-4-6",
    "anthropic/claude-sonnet-4-5",
    "anthropic/claude-sonnet-4-5-20250929",
    "google-antigravity/claude-sonnet-4-5-thinking",
    "google-antigravity/claude-sonnet-4-5",
    "anthropic/claude-sonnet-4-0",
    "anthropic/claude-sonnet-4-20250514",
    "anthropic/claude-3-7-sonnet-latest",
    "anthropic/claude-3-7-sonnet-20250219",
    "anthropic/claude-3-5-sonnet-20241022",
    "anthropic/claude-3-5-sonnet-20240620",
    "anthropic/claude-3-sonnet-20240229"
  ],
  opus: [
    "anthropic/claude-opus-4-6",
    "anthropic/claude-opus-4-5",
    "anthropic/claude-opus-4-5-20251101",
    "google-antigravity/claude-opus-4-5-thinking",
    "anthropic/claude-opus-4-1",
    "anthropic/claude-opus-4-1-20250805",
    "anthropic/claude-opus-4-0",
    "anthropic/claude-opus-4-20250514",
    "anthropic/claude-3-opus-20240229"
  ],
  "codex-high": [
    "openai-codex/gpt-5.3-codex",
    "openai-codex/gpt-5.2-codex",
    "openai-codex/gpt-5.2",
    "openai-codex/gpt-5.1",
    "openai-codex/gpt-5.1-codex-mini",
    "openai-codex/gpt-5.3-codex-spark",
    "google-antigravity/gpt-oss-120b-medium"
  ],
  "codex-xhigh": [
    "openai-codex/gpt-5.1-codex-max",
    "openai-codex/gpt-5.3-codex",
    "openai-codex/gpt-5.2-codex",
    "openai-codex/gpt-5.2",
    "openai-codex/gpt-5.1",
    "openai-codex/gpt-5.1-codex-mini",
    "openai-codex/gpt-5.3-codex-spark",
    "google-antigravity/gpt-oss-120b-medium"
  ]
};
