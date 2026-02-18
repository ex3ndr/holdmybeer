import type {
  ProviderDetection,
  ProviderModel,
  ProviderModelSelectionMode
} from "@/types";

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
    return providerModelScoreBest(
      models,
      input.mode ?? "balanced"
    )?.id;
  }

  for (const candidate of modelPriority) {
    const resolved = models.find((model) => providerModelMatches(model.id, candidate));
    if (resolved) {
      return resolved.id;
    }
  }

  return providerModelScoreBest(
    models,
    input.mode ?? "balanced"
  )?.id;
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

function providerModelScoreBest(
  models: readonly ProviderModel[],
  mode: ProviderModelSelectionMode
) {
  const ranked = [...models].sort((left, right) => {
    const scoreDiff = providerModelScore(right, mode) - providerModelScore(left, mode);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return left.id.localeCompare(right.id);
  });
  return ranked[0];
}

function providerModelScore(
  model: ProviderModel,
  mode: ProviderModelSelectionMode
): number {
  const searchText = [
    model.provider,
    model.modelId,
    model.name ?? ""
  ].join(" ").toLowerCase();

  let score = 0;
  const contextWindow = model.contextWindow ?? 0;
  const maxTokens = model.maxTokens ?? 0;

  if (mode === "fast") {
    // Prefer lighter models for short utility tasks.
    score += Math.max(0, 260 - Math.floor(contextWindow / 2_000));
    score += Math.max(0, 120 - Math.floor(maxTokens / 1_000));
    score += model.reasoning ? -10 : 10;
  } else {
    score += Math.min(300, Math.floor(contextWindow / 1_000));
    score += Math.min(200, Math.floor(maxTokens / 1_000));
    score += model.reasoning ? 20 : 0;
  }

  if (mode === "quality") {
    score += model.reasoning ? 25 : 0;
    score += providerModelKeywordBonus(searchText, [
      "pro",
      "max",
      "ultra",
      "high",
      "thinking",
      "large",
      "sonnet",
      "opus"
    ]);
    score -= providerModelKeywordBonus(searchText, [
      "mini",
      "small",
      "lite",
      "nano",
      "flash",
      "haiku",
      "low"
    ]);
  } else if (mode === "fast") {
    score += providerModelKeywordBonus(searchText, [
      "mini",
      "small",
      "lite",
      "nano",
      "flash",
      "haiku",
      "low"
    ]);
    score -= providerModelKeywordBonus(searchText, [
      "pro",
      "max",
      "ultra",
      "high",
      "thinking",
      "large",
      "sonnet",
      "opus"
    ]);
    score -= model.reasoning ? 10 : 0;
  }

  return score;
}

function providerModelKeywordBonus(searchText: string, keywords: readonly string[]): number {
  let score = 0;
  for (const keyword of keywords) {
    if (searchText.includes(keyword)) {
      score += 12;
    }
  }
  return score;
}
