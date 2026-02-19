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
      input.mode ?? "codex-high"
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
    input.mode ?? "codex-high"
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
  score += Math.min(320, Math.floor(contextWindow / 1_000));
  score += Math.min(240, Math.floor(maxTokens / 1_000));
  score += model.reasoning ? 25 : 0;

  switch (mode) {
    case "sonnet":
      score += providerModelKeywordBonus(searchText, ["sonnet"], 220);
      score += providerModelKeywordBonus(searchText, ["claude"], 30);
      score += model.reasoning ? 10 : 0;
      score -= providerModelKeywordBonus(searchText, ["mini", "small", "lite", "nano", "flash", "haiku"], 20);
      return score;
    case "opus":
      score += providerModelKeywordBonus(searchText, ["opus"], 260);
      score += providerModelKeywordBonus(searchText, ["claude"], 35);
      score += providerModelKeywordBonus(searchText, ["xhigh", "ultra", "max", "high", "thinking", "reasoning"], 18);
      score += model.reasoning ? 20 : 0;
      score -= providerModelKeywordBonus(searchText, ["mini", "small", "lite", "nano", "flash", "haiku"], 24);
      return score;
    case "codex-xhigh":
      score += providerModelKeywordBonus(searchText, ["codex"], 270);
      score += providerModelKeywordBonus(searchText, ["xhigh", "x_high", "ultra", "max", "high", "pro"], 20);
      score += providerModelKeywordBonus(searchText, ["gpt-5", "gpt5", "o3", "o1", "reasoning", "thinking"], 18);
      score += model.reasoning ? 20 : 0;
      score -= providerModelKeywordBonus(searchText, ["mini", "small", "lite", "nano", "flash", "haiku", "low"], 28);
      return score;
    case "codex-high":
      score += providerModelKeywordBonus(searchText, ["codex"], 240);
      score += providerModelKeywordBonus(searchText, ["high", "pro", "reasoning", "thinking", "gpt-5", "gpt5"], 14);
      score += model.reasoning ? 12 : 0;
      score -= providerModelKeywordBonus(searchText, ["xhigh", "x_high"], 220);
      score -= providerModelKeywordBonus(searchText, ["mini", "small", "lite", "nano", "flash", "haiku", "low"], 20);
      return score;
    default:
      return score;
  }
}

function providerModelKeywordBonus(
  searchText: string,
  keywords: readonly string[],
  weight = 12
): number {
  let score = 0;
  for (const keyword of keywords) {
    if (searchText.includes(keyword)) {
      score += weight;
    }
  }
  return score;
}
